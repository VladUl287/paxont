import { toArray } from "../../src/converters/array"
import { array, i16Array, i32Array, i64Array, i8Array, number, u16Array, u32Array, u64Array, u8Array } from "../../src/metadata/builder"
import { ArrayMeta, JsonParsingState, JsonParsingContext, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions, defaultOptions as dfo } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { ReadResult, ReadResultType } from "../../src/utils/types"
import { deserializePartially } from "./utils"

describe('toArray', () => {
    const encoder = new TextEncoder()

    const toBytes = (str: string): Uint8Array => encoder.encode(str)

    const deserialize = (meta: ArrayMeta<any, any>, data: Uint8Array, index = 0, depth = 0) => {
        return toArray(meta, {
            reader: { bytes: data, writable: false },
            options: defaultOptions,
            stack: new Stack<JsonParsingState>()
        }, index, depth)
    }

    const arrayMeta = array(number())

    describe('valid array', () => {
        test('converts simple number array string to array', () => {
            const bytes = toBytes("[1, 2, 3]")
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 9 })
        })

        test('converts empty array string to empty array', () => {
            const bytes = toBytes('[]')
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [], nextIndex: 2 })
        })

        test('converts array with single element', () => {
            const bytes = toBytes('[42]')
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [42], nextIndex: 4 })
        })
    })

    describe('invalid array', () => {
        test('depth exceed', () => {
            const bytes = toBytes("[1, 2, 3]")
            const result = deserialize(arrayMeta, bytes, 0, 128)
            expect(result).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('unexpected end of input', () => {
            const bytes = toBytes("[1]")
            const result = deserialize(arrayMeta, bytes, 3, 0)
            expect(result).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
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
            const result = deserialize(numericArray, bytes)
            expect(result).toEqual(error)
        })

        test('unexpected end of value', () => {
            const bytes = toBytes("[1, 2")
            const result = deserialize(arrayMeta, bytes)
            expect(result).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('partial array', () => {
        test('should parse partial all over array', () => {
            const input = [1, 12, 123, 1234, 12345]
            const str = JSON.stringify(input, undefined, 4)

            for (let i = 0; i < str.length; i++) {
                const chunks = [
                    toBytes(str.substring(0, i)),
                    toBytes(str.substring(i))
                ].reverse()

                const result = deserializePartially(arrayMeta, chunks)

                expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: chunks[0].length })
            }
        })
    })

    describe('edge cases and error handling', () => {
        test('returns empty array for invalid input if no error throwing', () => {
            const bytes = toBytes("not an array")
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('handles large arrays', () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i)
            const arrayString = '[' + largeArray.join(', ') + ']'
            const bytes = toBytes(arrayString)
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: largeArray,
                nextIndex: 4890
            })
        })
    })

    describe('whitespace handling', () => {
        test('handles spaces around elements', () => {
            const bytes = toBytes("[1, 2, 3]")
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 9
            })
        })

        test('handles spaces between brackets and elements', () => {
            const bytes = toBytes("[ 1, 2, 3 ]")
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 11
            })
        })

        test('handles newlines and tabs', () => {
            const bytes = toBytes("[\n  1,\n  2,\n  3\n]")
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 17
            })
        })

        test('handles multiple spaces', () => {
            const bytes = toBytes('[1,    2,    3]')
            const result = deserialize(arrayMeta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 15
            })
        })
    })

    describe('invalid input', () => {
        test('throws error for invalid JSON', () => {
            const bytes = toBytes('[1, 2, 3')
            const result = deserialize(arrayMeta, bytes)
            expect(result).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('throws error for non-array JSON', () => {
            const bytes = toBytes('{"a": 1}')
            const result = deserialize(arrayMeta, bytes)
            expect(result).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('throws error for empty string', () => {
            const bytes = toBytes('')
            const result = deserialize(arrayMeta, bytes)
            expect(result).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('throws error for null input', () => {
            expect(() => toArray(arrayMeta, null as any, 0, 0)).toThrow(TypeError)
        })

        test('throws error for undefined input', () => {
            expect(() => toArray(arrayMeta, undefined as any, 0, 0)).toThrow(TypeError)
        })
    })

    describe('TypedArray support', () => {
        test('converts to Int8Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i8Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Int8Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Uint8Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u8Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Uint8Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Int16Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i16Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Int16Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Uint16Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u16Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Uint16Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Int32Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i32Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Int32Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Uint32Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u32Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Uint32Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to BigInt64Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = i64Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new BigInt64Array([1n, 2n, 3n]),
                nextIndex: 9
            })
        })

        test('converts to BigUint64Array when factory is provided', () => {
            const bytes = toBytes('[1, 2, 3]')
            const meta = u64Array()
            const result = deserialize(meta, bytes)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new BigUint64Array([1n, 2n, 3n]),
                nextIndex: 9
            })
        })
    })
})
