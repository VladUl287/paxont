import { bool, nullable } from "../../src/metadata/builder"
import { expectError, expectToParse } from "./utils"

describe('toNullable', () => {
    const meta = nullable(bool())

    describe('basic parsing', () => {
        test('should parse simple null', () => {
            expectToParse({ meta, raw: 'null' })
        })

        test('should handle nullable value', () => {
            expectToParse({ meta, raw: 'false' })
            expectToParse({ meta, raw: 'true' })
        })
    })

    describe('error handling', () => {
        test('should throw error for invalid JSON', () => {
            expectError({ meta, raw: 'NULL' })
        })

        test('should throw error for not enough data', () => {
            expectError({ meta, raw: 'NU' })
        })

        test('should throw error for invalid value JSON', () => {
            expectError({ meta, raw: 'FALSE' })
        })
    })
})