import { toArray } from "../../src/converters/array"
import { array, number } from "../../src/metadata/builder"
import { ConvertState, ParseContext, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions, defaultOptions as dfo } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { ReadResult, ReadResultType } from "../../src/utils/types"

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

    const asyncCtx = (bytes: Uint8Array, options = dfo, stack = new Stack<ConvertState>()) => ({
        reader: { bytes: bytes, writable: true },
        options: options,
        stack: stack
    })

    const arrayMeta = array(number())

    describe('valid array', () => {
        test('converts simple number array string to array', () => {
            const bytes = jsonArrayToBytes("[1, 2, 3]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual([1, 2, 3])
        })

        test('converts string array with quotes to array', () => {
            const bytes = jsonArrayToBytes("[\"test\", \"test\", \"test\"]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual(['test', 'test', 'test'])
        })

        test('converts empty array string to empty array', () => {
            const bytes = jsonArrayToBytes('[]')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual([])
        })

        test('converts array with single element', () => {
            const bytes = jsonArrayToBytes('[42]')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual([42])
        })
    })

    describe('invalid array', () => {
        test('depth exceed', () => {
            const bytes = jsonArrayToBytes("[1, 2, 3]")
            const array = toArray(arrayMeta, syncCtx(bytes, defaultOptions), 0, defaultOptions.maxDepth + 1)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })

        test('unexpected end of input', () => {
            const bytes = jsonArrayToBytes("[1]")
            const array = toArray(arrayMeta, syncCtx(bytes), 3, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })

        test('item parse error', () => {
            const bytes = jsonArrayToBytes("[1]")
            const error: ReadResult<number> = {
                type: ReadResultType.ERROR,
                error: new JSONParseError('mock error')
            }
            const numericArray = array({
                ...number(),
                toValue: (m: PrimitiveMeta<number>, c: ParseContext, i: number, d: number): ReadResult<number> => error
            })
            const result = toArray(numericArray, syncCtx(bytes), 0, 0)
            expect(result).toStrictEqual(error)
        })

        test('unexpected end of value', () => {
            const bytes = jsonArrayToBytes("[1, 2")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })
    })

    describe('partial array', () => {
        test('start splitted', () => {
            const chunks = [jsonArrayToBytes("["), jsonArrayToBytes("1,2,3]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('start splitted with whitespace', () => {
            const chunks = [jsonArrayToBytes("[ "), jsonArrayToBytes("1,2,3]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('value splitted', () => {
            const chunks = [jsonArrayToBytes("[1"), jsonArrayToBytes(",2,3]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('value splitted with whitespace', () => {
            const chunks = [jsonArrayToBytes("[1 "), jsonArrayToBytes(",2,3]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('comma splitted', () => {
            const chunks = [jsonArrayToBytes("[1,"), jsonArrayToBytes("2,3]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('comma splitted with whitespace', () => {
            const chunks = [jsonArrayToBytes("[1, "), jsonArrayToBytes("2,3]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('end splited', () => {
            const chunks = [jsonArrayToBytes("[1, 2, 3"), jsonArrayToBytes("]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
        test('end splited with whitespace', () => {
            const chunks = [jsonArrayToBytes("[1, 2, 3"), jsonArrayToBytes(" ]")].reverse()
            let ch
            let result
            const stack = new Stack<ConvertState>()
            while ((ch = chunks.pop()) !== undefined) {
                result = toArray(arrayMeta, asyncCtx(ch, dfo, stack), 0, 0)
            }
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: [1, 2, 3], nextIndex: 7 })
        })
    })

    describe('edge cases and error handling', () => {
        test('returns empty array for invalid input if no error throwing', () => {
            expect(() => jsonArrayToBytes('not an array')).toThrow()
        })

        test('handles large arrays', () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i)
            const arrayString = '[' + largeArray.join(', ') + ']'
            expect(jsonArrayToBytes(arrayString)).toEqual(largeArray)
        })
    })

    describe('whitespace handling', () => {
        test('handles spaces around elements', () => {
            const bytes = jsonArrayToBytes("[1, 2, 3]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toStrictEqual([1, 2, 3])
        })

        test('handles spaces between brackets and elements', () => {
            const bytes = jsonArrayToBytes("[ 1, 2, 3 ]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual([1, 2, 3])
        })

        test('handles newlines and tabs', () => {
            const bytes = jsonArrayToBytes("[\n  1,\n  2,\n  3\n]")
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual([1, 2, 3])
        })

        test('handles multiple spaces', () => {
            const bytes = jsonArrayToBytes('[1,    2,    3]')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual([1, 2, 3])
        })
    })

    describe('invalid input', () => {
        test('throws error for invalid JSON', () => {
            const bytes = jsonArrayToBytes('[1, 2, 3')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })

        test('throws error for non-array JSON', () => {
            const bytes = jsonArrayToBytes('{"a": 1}')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })

        test('throws error for empty string', () => {
            const bytes = jsonArrayToBytes('')
            const array = toArray(arrayMeta, syncCtx(bytes), 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })

        test('throws error for null input', () => {
            const array = toArray(arrayMeta, null as any, 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })

        test('throws error for undefined input', () => {
            const array = toArray(arrayMeta, undefined as any, 0, 0)
            expect(array).toEqual({ type: ReadResultType.ERROR, error: new JSONParseError('') })
        })
    })

    // describe('TypedArray support', () => {
    //     test('converts to Int8Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Int8Array)
    //         expect(result).toBeInstanceOf(Int8Array)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Uint8Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Uint8Array)
    //         expect(result).toBeInstanceOf(Uint8Array)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Uint8ClampedArray when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Uint8ClampedArray)
    //         expect(result).toBeInstanceOf(Uint8ClampedArray)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Int16Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Int16Array)
    //         expect(result).toBeInstanceOf(Int16Array)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Uint16Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Uint16Array)
    //         expect(result).toBeInstanceOf(Uint16Array)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Int32Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Int32Array)
    //         expect(result).toBeInstanceOf(Int32Array)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Uint32Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Uint32Array)
    //         expect(result).toBeInstanceOf(Uint32Array)
    //         expect(Array.from(result)).toEqual([1, 2, 3])
    //     })

    //     test('converts to Float32Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1.5, 2.5, 3.5]', Float32Array)
    //         expect(result).toBeInstanceOf(Float32Array)
    //         expect(Array.from(result)).toEqual([1.5, 2.5, 3.5])
    //     })

    //     test('converts to Float64Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1.5, 2.5, 3.5]', Float64Array)
    //         expect(result).toBeInstanceOf(Float64Array)
    //         expect(Array.from(result)).toEqual([1.5, 2.5, 3.5])
    //     })

    //     test('converts to BigInt64Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', BigInt64Array)
    //         expect(result).toBeInstanceOf(BigInt64Array)
    //         expect(Array.from(result)).toEqual([1n, 2n, 3n])
    //     })

    //     test('converts to BigUint64Array when factory is provided', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', BigUint64Array)
    //         expect(result).toBeInstanceOf(BigUint64Array)
    //         expect(Array.from(result)).toEqual([1n, 2n, 3n])
    //     })
    // })

    // describe('type checking', () => {
    //     test('returns Array by default', () => {
    //         expect(jsonArrayToBytes('[1, 2, 3]')).toBeInstanceOf(Array)
    //     })

    //     test('returns correct TypedArray type', () => {
    //         const result = jsonArrayToBytes('[1, 2, 3]', Int8Array)
    //         expect(Object.prototype.toString.call(result)).toBe('[object Int8Array]')
    //     })
    // })
})
