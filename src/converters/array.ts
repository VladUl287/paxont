import { BaseMeta, ArrayMeta, JsonParsingContext, MetaValue } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/ascii_symbols"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { ArrayLikeWritable } from "../utils/array"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toArray<A extends ArrayLikeWritable<MetaValue<M>>, M extends BaseMeta<any>>(
    metadata: ArrayMeta<A, M>,
    context: JsonParsingContext,
    i: number,
    depth: number
): ReadResult<A> {
    const { reader, stack, options } = context

    if (depth > options.maxDepth) {
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { depth, index: i, metadata })
        }
    }

    const b = reader.bytes
    const len = b.length

    if (i >= len) {
        if (reader.writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input`, { depth, index: i, metadata })
        }
    }


    const state = stack.pop()

    let isContinued: boolean = state?.isContinued ?? false
    let bufferIndex: number = state?.bufferIndex ?? 0

    const { rent, release, clear } = metadata.pool
    const buffer: A = state?.buffer ?? rent(b.length - i)

    if (!isContinued) {
        if (b[i] !== SQUARE_OPEN) {
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
            }
        }

        if (b[++i] === SQUARE_CLOSE) {
            return {
                type: COMPLETE,
                value: buffer.slice(0, 0),
                nextIndex: ++i
            }
        }
    }

    const item = metadata.value
    const toValue = item.toValue

    let j = bufferIndex
    while (true) {
        i = skipWhitespace(b, i)

        if (isContinued) {
            if (b[i] === COMMA) {
                i++
            }
            else if (b[i] === SQUARE_CLOSE) {
                break
            }
        }

        const result = toValue(item, context, i, depth)

        if (isError(result)) {
            release(buffer)
            return result
        }

        if (isNeedsMoreData(result)) {
            stack.push({ isContinued: true, buffer, bufferIndex: j })
            return result
        }

        buffer[j] = result.value
        i = result.nextIndex
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA) {
            i++
        }
        else if (b[i] === SQUARE_CLOSE) {
            break
        }
        else {
            if (i >= b.length && reader.writable) {
                stack.push({ isContinued: true, buffer, bufferIndex: j })
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
            release(buffer)
            return {
                type: ERROR,
                error: new JSONParseError(`Expected ']' or ',' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
            }
        }
    }

    const result = buffer.slice(0, j);
    clear(buffer, 0, j)
    release(buffer)

    return {
        type: COMPLETE,
        value: result,
        nextIndex: ++i
    }
}
