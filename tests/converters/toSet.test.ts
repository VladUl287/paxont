import { number, set } from "../../src/metadata/builder"
import { JsonParsingContext, SetMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { Stack } from "../../src/utils/stack"
import { isComplete, ReadResultType } from "../../src/utils/types"
import { deserializePartially, expectError, toBytes } from "./utils"

describe('toSet', () => {
    const meta = set(number())

    function setToString(set: Set<any>): string {
        return JSON.stringify([...set])
    }

    function expectSet(meta: SetMeta<any>, str: string) {
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: { bytes: bytes, writable: false },
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
            expect(setToString(result.value)).toEqual(str)
        }

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: expect.any(Set),
                nextIndex: chunks[0].length
            })

            if (isComplete(result)) {
                expect(setToString(result.value)).toEqual(str)
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
    })

    describe('error handling', () => {
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