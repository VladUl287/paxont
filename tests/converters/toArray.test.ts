import { array, i16Array, i32Array, i64Array, i8Array, number, string, u16Array, u32Array, u64Array, u8Array } from "../../src/metadata/builder"
import { JsonParsingContext, PrimitiveMeta } from "../../src/metadata/types"
import { JSONParseError } from "../../src/utils/error"
import { ReadResult, ReadResultType } from "../../src/utils/result"
import { expectError, expectToParse } from "./utils"

describe('toArray', () => {
    const meta = array(number())

    describe('valid array', () => {
        test('converts number array', () => {
            expectToParse({ meta, raw: "[1, 2, 3]" })
        })

        test('converts string array', () => {
            expectToParse({ meta: array(string()), raw: '["a a a a a", "а а а а а", "Å Å Å Å Å"]' })
        })

        test('converts empty array', () => {
            expectToParse({ meta, raw: '[]' })
        })

        test('converts array with single element', () => {
            expectToParse({ meta, raw: '[42]' })
        })
    })

    describe('invalid array', () => {
        test('depth exceed', () => {
            expectError({ meta, raw: '[1, 2, 3]', depth: 128 })
        })

        test('item parse error', () => {
            const error: ReadResult<number> = {
                type: ReadResultType.ERROR,
                error: new JSONParseError('')
            }
            const mockMeta = array(number((m) => ({
                ...m,
                toValue: (m: PrimitiveMeta<number>, c: JsonParsingContext): ReadResult<number> => error
            })))
            expectError({ meta: mockMeta, raw: '[1, 2, 3]' })
        })

        test('unexpected end of value', () => {
            expectError({ meta, raw: '[1, 2' })
        })

        test('not array at all', () => {
            expectError({ meta, raw: 'not an array' })
        })
    })

    describe('edge cases and error handling', () => {
        test('handles large arrays', () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i)
            const arrayString = '[' + largeArray.join(', ') + ']'
            expectToParse({ meta, raw: arrayString })
        })
    })

    describe('whitespace handling', () => {
        test('handles spaces around elements', () => {
            expectToParse({ meta, raw: '[1, 2, 3]' })
        })

        test('handles spaces between brackets and elements', () => {
            expectToParse({ meta, raw: '[ 1, 2, 3 ]' })
        })

        test('handles newlines and tabs and spaces', () => {
            expectToParse({ meta, raw: '[\n     1,\n     2,\n     3\n]' })
        })
    })

    describe('invalid input', () => {
        test('throws error for invalid JSON', () => {
            expectError({ meta, raw: '[1, 2, 3' })
        })

        test('throws error for non-array JSON', () => {
            expectError({ meta, raw: '{"a": 1}' })
        })

        test('throws error for empty string', () => {
            expectError({ meta, raw: '' })
        })
    })

    describe('TypedArray support', () => {
        test('converts to Int8Array', () => {
            const meta = i8Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new Int8Array([1, 2, 3]) })
        })

        test('error on convert to Int8Array', () => {
            const meta = i8Array()
            expectError({ meta, raw: '[128, 128, 128]' })
        })

        test('converts to Uint8Array', () => {
            const meta = u8Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new Uint8Array([1, 2, 3]) })
        })

        test('error on convert to Uint8Array', () => {
            const meta = u8Array()
            expectError({ meta, raw: '[256, 256, 256]' })
        })

        test('converts to Int16Array', () => {
            const meta = i16Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new Int16Array([1, 2, 3]) })
        })

        test('error on convert to Int16Array', () => {
            const meta = i16Array()
            expectError({ meta, raw: '[32768, 32768, 32768]' })
        })

        test('converts to Uint16Array', () => {
            const meta = u16Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new Uint16Array([1, 2, 3]) })
        })

        test('error on convert to Uint16Array', () => {
            const meta = u16Array()
            expectError({ meta, raw: '[65536, 65536, 65536]' })
        })

        test('converts to Int32Array', () => {
            const meta = i32Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new Int32Array([1, 2, 3]) })
        })

        test('error on convert to Int32Array', () => {
            const meta = i32Array()
            expectError({ meta, raw: '[2147483648, 2147483648, 2147483648]' })
        })

        test('converts to Uint32Array', () => {
            const meta = u32Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new Uint32Array([1, 2, 3]) })
        })

        test('error on convert to Uint32Array', () => {
            const meta = u32Array()
            expectError({ meta, raw: '[4294967296, 4294967296, 4294967296]' })
        })

        test('converts to BigInt64Array', () => {
            const meta = i64Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new BigInt64Array([1n, 2n, 3n]) })
        })

        test('error on convert to BigInt64Array', () => {
            const meta = i64Array()
            expectError({ meta, raw: '[9223372036854775807n, 9223372036854775807n, 9223372036854775807n]' })
        })

        test('converts to BigUint64Array', () => {
            const meta = u64Array()
            expectToParse({ meta, raw: '[1, 2, 3]', expected: new BigUint64Array([1n, 2n, 3n]) })
        })

        test('error on convert to BigUint64Array', () => {
            const meta = u64Array()
            expectError({ meta, raw: '[18446744073709551615n, 18446744073709551615n, 18446744073709551615n]' })
        })
    })
})
