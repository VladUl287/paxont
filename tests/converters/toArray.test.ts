import { array, i16Array, i32Array, i64Array, i8Array, number, u16Array, u32Array, u64Array, u8Array } from "../../src/metadata/builder"
import { ArrayMeta, JsonParsingContext, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { ReadResult, ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { deserializePartially } from "./utils"

describe('toArray', () => {
    const encoder = new TextEncoder()

    const toBytes = (str: string): Uint8Array => encoder.encode(str)

    function expectError(meta: ArrayMeta<any, any>, bytes: Uint8Array, index = 0, depth = 0) {
        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, index, depth)
        expect(result).toStrictEqual({
            type: ReadResultType.ERROR,
            error: expect.any(JSONParseError)
        })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks, index, depth)

            expect(result).toStrictEqual({
                type: ReadResultType.ERROR,
                error: expect.any(JSONParseError)
            })
        }
    }

    const expectToParse = (meta: ArrayMeta<any, any>, bytes: Uint8Array, index = 0, depth = 0, result?: any) => {
        const reader = new JsonReader(bytes, bytes.length, false)

        const ctx: JsonParsingContext = {
            reader: reader,
            options: defaultOptions,
            stack: new Stack(),
        }

        const expectedResult = result ?? JSON.parse(new TextDecoder().decode(bytes))

        const value = meta.toValue(meta, ctx, index, depth)
        expect(value).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expectedResult,
            nextIndex: bytes.length
        })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()

            try {
                const result = deserializePartially(meta, chunks, index, depth)

                expect(result).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: expectedResult,
                    nextIndex: chunks[0].length
                })
            }
            catch (error) {
                throw error
            }
        }
    }

    const arrayMeta = array(number())

    describe('valid array', () => {
        test('converts simple number array string to array', () => {
            const bytes = toBytes("[1, 2, 3]")
            expectToParse(arrayMeta, bytes, 0, 0)
        })

        test('converts empty array string to empty array', () => {
            const bytes = toBytes('[]')
            expectToParse(arrayMeta, bytes, 0, 0)
        })

        test('converts array with single element', () => {
            const bytes = toBytes('[42]')
            expectToParse(arrayMeta, bytes, 0, 0)
            expectToParse(arrayMeta, bytes, 0, 0)
        })
    })

    describe('invalid array', () => {
        test('depth exceed', () => {
            const bytes = toBytes("[1, 2, 3]")
            expectError(arrayMeta, bytes, 0, 128)
        })

        test('unexpected end of input', () => {
            const bytes = toBytes("[1]")
            expectError(arrayMeta, bytes, 3, 0)
        })

        test('item parse error', () => {
            const bytes = toBytes("[1]")
            const error: ReadResult<number> = {
                type: ReadResultType.ERROR,
                error: expect.any(JSONParseError)
            }
            const numericArray = array(number((m) => ({
                ...m,
                toValue: (m: PrimitiveMeta<number>, c: JsonParsingContext, i: number, d: number): ReadResult<number> => error
            })))
            expectError(numericArray, bytes)
        })

        test('unexpected end of value', () => {
            const bytes = toBytes("[1, 2")
            expectError(arrayMeta, bytes)
        })

        test('not array at all', () => {
            const bytes = toBytes("not an array")
            expectError(arrayMeta, bytes)
        })
    })

    describe('edge cases and error handling', () => {
        test('handles large arrays', () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i)
            const arrayString = '[' + largeArray.join(', ') + ']'
            const bytes = toBytes(arrayString)
            expectToParse(arrayMeta, bytes)
        })
    })

    describe('whitespace handling', () => {
        test('handles spaces around elements', () => {
            const bytes = toBytes("[1, 2, 3]")
            expectToParse(arrayMeta, bytes)
        })

        test('handles spaces between brackets and elements', () => {
            const bytes = toBytes("[ 1, 2, 3 ]")
            expectToParse(arrayMeta, bytes)
        })

        test('handles newlines and tabs', () => {
            const bytes = toBytes("[\n  1,\n  2,\n  3\n]")
            expectToParse(arrayMeta, bytes)
        })

        test('handles multiple spaces', () => {
            const bytes = toBytes('[1,    2,    3]')
            expectToParse(arrayMeta, bytes)
        })
    })

    describe('invalid input', () => {
        test('throws error for invalid JSON', () => {
            const bytes = toBytes('[1, 2, 3')
            expectError(arrayMeta, bytes)
        })

        test('throws error for non-array JSON', () => {
            const bytes = toBytes('{"a": 1}')
            expectError(arrayMeta, bytes)
        })

        test('throws error for empty string', () => {
            const bytes = toBytes('')
            expectError(arrayMeta, bytes)
        })
    })

    describe('TypedArray support', () => {
        test('converts to Int8Array when factory is provided', () => {
            const bytes = toBytes('[11, 2, 33]')
            const meta = i8Array()
            expectToParse(meta, bytes, 0, 0, new Int8Array([11, 2, 33]))
        })

        test('converts to Uint8Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u8Array()
            expectToParse(meta, bytes, 0, 0, new Uint8Array([1, 2, 3]))
        })

        test('converts to Int16Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i16Array()
            expectToParse(meta, bytes, 0, 0, new Int16Array([1, 2, 3]))
        })

        test('converts to Uint16Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u16Array()
            expectToParse(meta, bytes, 0, 0, new Uint16Array([1, 2, 3]))
        })

        test('converts to Int32Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i32Array()
            expectToParse(meta, bytes, 0, 0, new Int32Array([1, 2, 3]))
        })

        test('converts to Uint32Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u32Array()
            expectToParse(meta, bytes, 0, 0, new Uint32Array([1, 2, 3]))
        })

        test('converts to BigInt64Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i64Array()
            expectToParse(meta, bytes, 0, 0, new BigInt64Array([1n, 2n, 3n]))
        })

        test('converts to BigUint64Array when factory is provided', () => {
            const bytes = toBytes('[123324, 23453, 3234235]')
            const meta = u64Array()
            expectToParse(meta, bytes, 0, 0, new BigUint64Array([123324n, 23453n, 3234235n]))
        })
    })
})
