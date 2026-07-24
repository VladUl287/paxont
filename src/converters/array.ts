import { BaseMeta, ArrayMeta, ParseContext } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/ascii_symbols"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { ArrayLikeWritable } from "../utils/array"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toArray<T, A extends ArrayLikeWritable<T>, M extends BaseMeta<T, M>>(
    metadata: ArrayMeta<T, A, M>,
    context: ParseContext,
    i: number,
    depth: number
): ReadResult<A> {
    const reader = context.reader
    const options = context.options

    if (depth > options.maxDepth)
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { depth, index: i, metadata })
        }

    const b = reader.bytes
    const len = b.length

    if (i >= len) {
        if (reader.writable)
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }

        return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input`, { depth, index: i, metadata })
        }
    }

    let isContinued: boolean
    let buffer: A
    let bufferIndex: number

    const { rent, release } = metadata.arrayPool

    const stack = context.stack
    const state = stack.pop()
    if (state !== undefined) {
        isContinued = state.isContinued
        buffer = state.buffer
        bufferIndex = state.bufferIndex
    }
    else {
        isContinued = false
        buffer = rent(b.length - i)
        bufferIndex = 0
    }

    if (!isContinued) {
        if (b[i] !== SQUARE_OPEN)
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
            }
        i++
    }

    try {
        const itemMetadata = metadata.value
        const toValue = itemMetadata.toValue

        let j = bufferIndex
        while (true) {
            i = skipWhitespace(b, i)

            const result = toValue(itemMetadata, context, i, depth)

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

            i = skipWhitespace(b, i)

            if (b[i] === COMMA) i++
            else if (b[i] === SQUARE_CLOSE) break
            else return {
                type: ERROR,
                error: new JSONParseError(`Expected ']' or ',' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
            }
        }

        return {
            type: COMPLETE,
            value: buffer.slice(0, j),
            nextIndex: ++i
        }
    }
    catch (error) {
        return {
            type: ERROR,
            error: new JSONParseError('Unknown error', { depth, index: i, metadata, cause: error })
        }
    }
    finally {
        release(buffer)
    }
}
