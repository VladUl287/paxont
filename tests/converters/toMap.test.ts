import { bool, map } from "../../src/metadata/builder"
import { isComplete } from "../../src/utils/result"
import { expectError, expectToParse } from "./utils"

describe('toMap', () => {
    const meta = map(bool())

    function mapToString(map: Map<any, any>): string {
        const obj = Object.fromEntries(map)
        return JSON.stringify(obj)
    }

    describe('Basic parsing with UTF-8 bytes', () => {
        test('should parse simple JSON object to Map', () => {
            const value = '{"name":false,"age":true,"city":true}'
            expectToParse({
                meta, raw: value, expected: expect.any(Map),
                alsoExpect: (result) => (isComplete(result) && expect(mapToString(result.value)).toEqual(value))
            })
        })

        test('should parse big JSON object to Map', () => {
            const value = JSON.stringify(Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`field_${i}`, false])))
            expectToParse({
                meta, raw: value, expected: expect.any(Map),
                alsoExpect: (result) => (isComplete(result) && expect(mapToString(result.value)).toEqual(value))
            })
        })

        test('should handle empty objects', () => {
            const value = '{}'
            expectToParse({
                meta, raw: value, expected: expect.any(Map),
                alsoExpect: (result) => (isComplete(result) && expect(mapToString(result.value)).toEqual(value))
            })
        })
    })

    describe('Error handling', () => {
        test('should throw error for invalid JSON', () => {
            expectError({ meta, raw: '{"name":true,"age":false,}' })
        })

        test('should throw error for non-object/non-array input', () => {
            expectError({ meta, raw: '"just a string"' })
        })

        test('should throw error for null input', () => {
            expectError({ meta, raw: 'null' })
        })

        test('should throw error for malformed UTF-8', () => {
            expectError({ meta, raw: String.fromCharCode(0x80) })
        })
    })
})