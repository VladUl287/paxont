import { toArray } from "../../src/converters/array"
import { array, i16Array, i32Array, i64Array, i8Array, number, string, u16Array, u32Array, u64Array, u8Array } from "../../src/metadata/builder"
import { ConvertState, ParseContext, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions, defaultOptions as dfo } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { isNeedsMoreData, ReadResult, ReadResultType } from "../../src/utils/types"

describe('toArray', () => {
    const encoder = new TextEncoder()
    const jsonArrayToBytes = (jsonArray: string): Uint8Array => {
        return encoder.encode(jsonArray)
    }

    const syncCtx = (bytes: Uint8Array, options = dfo) => ({
        reader: { bytes: bytes, writable: false },
        options: options,
        stack: new Stack<ConvertState>()
    })

    const asyncCtx = (bytes: Uint8Array, options = dfo, stack = new Stack<ConvertState>(), writable: boolean = false) => ({
        reader: { bytes, writable },
        options: options,
        stack: stack
    })

    const arrayMeta = array(number())

    describe('valid array', () => {
        test('converts simple number array string to array', () => {
            const bytes = jsonArrayToBytes("[1, 2, 3]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 9 })
        })

        test('converts empty array string to empty array', () => {
            const bytes = jsonArrayToBytes('[]')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({ type: ReadResultType.COMPLETE, value: [], nextIndex: 2 })
        })

        test('converts array with single element', () => {
            const bytes = jsonArrayToBytes('[42]')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({ type: ReadResultType.COMPLETE, value: [42], nextIndex: 4 })
        })
    })

    describe('invalid array', () => {
        test('depth exceed', () => {
            const bytes = jsonArrayToBytes("[1, 2, 3]")
            const array = toArray(arrayMeta, syncCtx(bytes, defaultOptions), 0, defaultOptions.maxDepth + 1)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('unexpected end of input', () => {
            const bytes = jsonArrayToBytes("[1]")
            const array = toArray(arrayMeta, syncCtx(bytes), 3, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('item parse error', () => {
            const bytes = jsonArrayToBytes("[1]")
            const error: ReadResult<number> = {
                type: ReadResultType.ERROR,
                error: expect.any(JSONParseError)
            }
            const numericArray = array(number((m) => ({
                ...m,
                toValue: (m: PrimitiveMeta<number>, c: ParseContext, i: number, d: number): ReadResult<number> => error
            })))
            const result = toArray(numericArray, syncCtx(bytes), 0, 0)
            expect(result).toEqual(error)
        })

        test('unexpected end of value', () => {
            const bytes = jsonArrayToBytes("[1, 2")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('partial array', () => {
        test('start splitted', () => {
            const chunks = [jsonArrayToBytes("["), jsonArrayToBytes("1,2,3]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 6 })
        })
        test('start splitted with whitespace', () => {
            const chunks = [jsonArrayToBytes("[ "), jsonArrayToBytes("1,2,3]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 6 })
        })
        test('value splitted', () => {
            const chunks = [jsonArrayToBytes("[1"), jsonArrayToBytes(",2,3]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 6 })
        })
        test('value splitted with whitespace', () => {
            const chunks = [jsonArrayToBytes("[1 "), jsonArrayToBytes(",2,3]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 5 })
        })
        test('comma splitted', () => {
            const chunks = [jsonArrayToBytes("[1,"), jsonArrayToBytes("2,3]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 4 })
        })
        test('comma splitted with whitespace', () => {
            const chunks = [jsonArrayToBytes("[1, "), jsonArrayToBytes("2,3]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 4 })
        })
        test('end splited', () => {
            const chunks = [jsonArrayToBytes("[1, 2, 3"), jsonArrayToBytes("]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 2 })
        })
        test('end splited with whitespace', () => {
            const chunks = [jsonArrayToBytes("[1, 2, 3"), jsonArrayToBytes(" ]")].reverse()
            let ch
            let result
            let index = 0
            let tempCh: number[] = []
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                const ctx = asyncCtx(new Uint8Array([...tempCh, ...ch]), dfo, stack, chunks.length !== 0)
                result = toArray(arrayMeta, ctx, index, 0)
                if (isNeedsMoreData(result)) {
                    index = result.nextIndex - ch.length
                    tempCh = [...ch.slice(result.nextIndex)]
                }
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 3 })
        })
    })

    describe('edge cases and error handling', () => {
        test('returns empty array for invalid input if no error throwing', () => {
            const bytes = jsonArrayToBytes("not an array")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('handles large arrays', () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i)
            const arrayString = '[' + largeArray.join(', ') + ']'
            const bytes = jsonArrayToBytes(arrayString)
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: largeArray,
                nextIndex: 4890
            })
        })
    })

    describe('whitespace handling', () => {
        test('handles spaces around elements', () => {
            const bytes = jsonArrayToBytes("[1, 2, 3]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 9
            })
        })

        test('handles spaces between brackets and elements', () => {
            const bytes = jsonArrayToBytes("[ 1, 2, 3 ]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 11
            })
        })

        test('handles newlines and tabs', () => {
            const bytes = jsonArrayToBytes("[\n  1,\n  2,\n  3\n]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 17
            })
        })

        test('handles multiple spaces', () => {
            const bytes = jsonArrayToBytes('[1,    2,    3]')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: [1, 2, 3],
                nextIndex: 15
            })
        })
    })

    describe('invalid input', () => {
        test('throws error for invalid JSON', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('throws error for non-array JSON', () => {
            const bytes = jsonArrayToBytes('{"a": 1}')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('throws error for empty string', () => {
            const bytes = jsonArrayToBytes('')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
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
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = i8Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Int8Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Uint8Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = u8Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Uint8Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Int16Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = i16Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Int16Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Uint16Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = u16Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Uint16Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Int32Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = i32Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Int32Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to Uint32Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = u32Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new Uint32Array([1, 2, 3]),
                nextIndex: 9
            })
        })

        test('converts to BigInt64Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = i64Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new BigInt64Array([1n, 2n, 3n]),
                nextIndex: 9
            })
        })

        test('converts to BigUint64Array when factory is provided', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3]')
            const meta = u64Array()
            const array = toArray(meta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: new BigUint64Array([1n, 2n, 3n]),
                nextIndex: 9
            })
        })
    })
})
