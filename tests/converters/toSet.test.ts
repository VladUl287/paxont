import { bool, number, object, set, string } from "../../src/metadata/builder"
import { keySelector } from "../../src/metadata/modifiers"
import { JsonParsingContext, SetMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JsonReader } from "../../src/utils/reader"
import { isComplete, ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { deserializePartially, expectError, toBytes } from "./utils"

describe('toSet', () => {
    const meta = set(number())

    function setToString(set: Set<any>): string {
        return JSON.stringify([...set])
    }

    function expectSet(meta: SetMeta<any>, str: string, expectedResult?: string) {
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expect.any(Set),
            nextIndex: bytes.length
        })

        if (isComplete(result)) {
            expect(setToString(result.value)).toEqual(expectedResult ?? str)
        }

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            try {
                expect(result).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: expect.any(Set),
                    nextIndex: chunks[0].length
                })

                if (isComplete(result)) {
                    expect(setToString(result.value)).toEqual(expectedResult ?? str)
                }
            } catch (error) {
                console.log('error on: ', i)
                throw error
            }
        }
    }

    describe('basic parsing', () => {
        test('should parse simple set', () => {
            const str = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
            expectSet(meta, str)
        })

        test('should parse empty set', () => {
            const str = JSON.stringify([])
            expectSet(meta, str)
        })

        test('should parse big set', () => {
            const str = JSON.stringify(Array.from({ length: 1000 }, (_, i) => i))
            expectSet(meta, str)
        })

        test('should parse big set with key selector function', () => {
            const str = JSON.stringify(Array.from({ length: 1000 }, (_, i) => i))
            expectSet(set(number(), keySelector((v) => v + 1)), str)
        })

        test('should parse object set with key selector function', () => {
            const array = Array.from({ length: 100 }, (_, i) => ({
                id: i,
                name: `test-${i}`,
                isActive: true
            }))
            array[0].id = 0
            array[1].id = 0

            const str = JSON.stringify(array)
            const meta = set(
                object({
                    id: number(),
                    name: string(),
                    isActive: bool()
                }),
                keySelector((v) => v.id))

            const bytes = toBytes(str)
            const context: JsonParsingContext = {
                reader: new JsonReader(bytes, bytes.length, false),
                options: defaultOptions,
                stack: new Stack()
            }

            const result = meta.toValue(meta, context, 0, 0)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: expect.any(Set),
                nextIndex: bytes.length
            })

            array.splice(1, 1)
            const exp = JSON.stringify(array)

            if (isComplete(result)) {
                expect(setToString(result.value)).toEqual(exp)
            }

            for (let i = 65; i < bytes.length; i++) {
                const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
                const result = deserializePartially(meta, chunks)

                try {
                    expect(result).toStrictEqual({
                        type: ReadResultType.COMPLETE,
                        value: expect.any(Set),
                        nextIndex: chunks[0].length
                    })

                    if (isComplete(result)) {
                        expect(setToString(result.value)).toEqual(exp)
                    }
                } catch (error) {
                    console.log('error on: ', i)
                    throw error
                }
            }
        })

        test('should parse big set formatted', () => {
            const array = Array.from({ length: 1000 }, (_, i) => i)
            const str = JSON.stringify(array, undefined, 4)
            expectSet(meta, str, JSON.stringify(array))
        })
    })

    describe('error handling', () => {
        test('should throw error if trailing comma presented', () => {
            const input = [true, false, true, false, true]
            const json = JSON.stringify(input).replace(']', ',]')
            expectError(set(bool()), json)
        })

        test('should throw error if invalid data presented', () => {
            const input = { id: 1, isActive: false }
            const json = JSON.stringify(input)
            expectError(meta, json)
        })

        test('should throw error if data not presented', () => {
            expectError(meta, '')
        })
    })
})