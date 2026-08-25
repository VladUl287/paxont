import { bool, number, object, set, string } from "../../src/metadata/builder"
import { keySelector } from "../../src/metadata/modifiers"
import { isComplete, ReadResult } from "../../src/utils/result"
import { expectError, expectToParse } from "./utils"

describe('toSet', () => {
    const meta = set(number())

    const setToJson = (set: Set<any>): string => JSON.stringify([...set])
    const expectSet = (exp: string) => (result: ReadResult<Set<any>>) =>
        isComplete(result) && expect(setToJson(result.value)).toEqual(exp)

    describe('basic parsing', () => {
        test('should parse simple set', () => {
            const raw = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
            expectToParse({ meta, raw: raw, expected: expect.any(Set), alsoExpect: expectSet(raw) })
        })

        test('should parse empty set', () => {
            const raw = JSON.stringify([])
            expectToParse({ meta, raw: raw, expected: expect.any(Set), alsoExpect: expectSet(raw) })
        })

        test('should parse big set', () => {
            const raw = JSON.stringify(Array.from({ length: 1000 }, (_, i) => i))
            expectToParse({ meta, raw: raw, expected: expect.any(Set), alsoExpect: expectSet(raw) })
        })

        test('should parse big set with key selector function', () => {
            const raw = JSON.stringify(Array.from({ length: 1000 }, (_, i) => i))
            expectToParse({ meta: set(number(), keySelector((v) => v + 1)), raw: raw, expected: expect.any(Set), alsoExpect: expectSet(raw) })
        })

        test('should parse object set with key selector function', () => {
            const array = Array.from({ length: 100 }, (_, i) => ({
                id: i,
                name: `test-${i}`,
                isActive: true
            }))
            array[0].id = 0
            array[1].id = 0

            const meta = set(
                object({
                    id: number(),
                    name: string(),
                    isActive: bool()
                }),
                keySelector((v) => v.id))

            array.splice(1, 1)
            const raw = JSON.stringify(array)
            expectToParse({ meta: meta, raw, expected: expect.any(Set), alsoExpect: expectSet(raw) })
        })

        test('should parse big set formatted', () => {
            const array = Array.from({ length: 1000 }, (_, i) => i)
            const raw = JSON.stringify(array, undefined, 4)
            expectToParse({ meta, expected: expect.any(Set), raw })
        })
    })

    describe('error handling', () => {
        test('should throw error if trailing comma presented', () => {
            const input = [true, false, true, false, true]
            const raw = JSON.stringify(input).replace(']', ',]')
            expectError({ meta: set(bool()), raw })
        })

        test('should throw error if invalid data presented', () => {
            const input = { id: 1, isActive: false }
            const raw = JSON.stringify(input)
            expectError({ meta, raw })
        })

        test('should throw error if data not presented', () => {
            expectError({ meta, raw: '' })
        })
    })
})