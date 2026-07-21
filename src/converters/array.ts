import { BaseMeta, ArrayMeta, JsonContext } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/ascii_symbols"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { copyArray, MutableArray } from "../utils/array"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toArray<T, A extends MutableArray<T>, M extends BaseMeta<T, M>>(
    metadata: ArrayMeta<T, A, M>,
    context: JsonContext,
    index: number,
    depth: number
): ReadResult<A> {
    const reader = context.reader
    const options = context.options

    if (depth > options.maxDepth)
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${index}`, index)
        }

    const b = reader.bytes
    const len = b.length

    let i = index
    if (i >= len) {
        if (reader.writable)
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }

        return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input at index ${i} while parsing array`, i)
        }
    }

    const stack = context.stack
    const state = stack.pop()

    if (!state || !state.isContinued) {
        if (b[i] !== SQUARE_OPEN)
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' at index ${i}, but found '${String.fromCharCode(b[i])}' while parsing array`, i)
            }
        i++
    }

    const { rent, release } = metadata.arrayPool

    let buffer = state?.buffer ?? rent(b.length - i)
    try {
        const itemMeta = metadata.value
        const tryParseValue = itemMeta.tryParseValue as any

        let j = state?.bufferIndex ?? 0
        while (true) {
            i = skipWhitespace(b, i)

            const result = tryParseValue(itemMeta, context, i, depth)

            if (isError(result))
                return result

            if (isNeedsMoreData(result)) {
                stack.push({
                    isContinued: true,
                    buffer: buffer,
                    bufferIndex: j
                })
                return result
            }

            buffer[j] = result.value
            i = result.nextIndex
            j++

            if (j >= buffer.length) {
                const newBuffer = copyArray(buffer, rent(buffer.length * 2))
                release(buffer)
                buffer = newBuffer
            }

            i = skipWhitespace(b, i)

            if (b[i] === COMMA) i++
            else if (b[i] === SQUARE_CLOSE) break
            else {
                return {
                    type: ERROR,
                    error: new JSONParseError(`Unexpected end of value at index ${i} while parsing array. Expected ']' or ',' as end of value`, i)
                }
            }
        }

        const value = buffer.slice(0, j)
        release(buffer)

        return {
            type: COMPLETE,
            value: value,
            nextIndex: ++i
        }
    }
    catch (error) {
        return {
            type: ERROR,
            error: new JSONParseError(
                `Unexpected error while parsing array at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
                i, { cause: error })
        }
    }
}
