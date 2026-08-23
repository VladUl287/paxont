import { BaseMeta, ArrayMeta, JsonParsingContext, MetaValue } from "../../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../../utils/ascii_symbols"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../../utils/result"
import { ArrayLikeWritable } from "../../utils/array"
import { JSONParseError } from "../../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toArray<A extends ArrayLikeWritable<MetaValue<M>>, M extends BaseMeta<any>>(
    metadata: ArrayMeta<A, M>,
    ctx: JsonParsingContext,
    i: number,
    d: number
): ReadResult<A> {
    const { reader, stack, options } = ctx

    if (d > options.maxDepth) {
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { depth: d, index: i, metadata })
        }
    }
    d++

    const { bytes: b, bytesLength: len, writable } = reader

    if (i >= len) {
        if (writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input`, { depth: d, index: i, metadata })
        }
    }


    const state = stack.pop()

    const isContinued: boolean = state?.isContinued ?? false
    const bufferIndex: number = state?.bufferIndex ?? 0

    const { rent, release, clear } = metadata.pool
    const buffer: A = state?.buffer ?? rent(len - i)

    if (!isContinued) {
        if (b[i] !== SQUARE_OPEN) {
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth: d, index: i, metadata })
            }
        }
        i++

        if (b[i] === SQUARE_CLOSE) {
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
        i = reader.skipWhitespace(i)

        if (isContinued) {
            if (b[i] === COMMA) {
                i = reader.skipWhitespace(++i)
            }
            else if (b[i] === SQUARE_CLOSE) { break }
        }

        // reader.setPosition(i)

        const result = toValue(item, ctx, i, d)

        if (isError(result)) {
            clear(buffer, 0, j)
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

        i = reader.skipWhitespace(i)

        if (b[i] === COMMA) { i++ }
        else if (b[i] === SQUARE_CLOSE) { break }
        else {
            if (i >= len && writable) {
                stack.push({ isContinued: true, buffer, bufferIndex: j })
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
            clear(buffer, 0, j)
            release(buffer)
            return {
                type: ERROR,
                error: new JSONParseError(`Expected ']' or ',' but found '${String.fromCharCode(b[i])}'`, { depth: d, index: i, metadata })
            }
        }
    }

    const result = buffer.slice(0, j)
    clear(buffer, 0, j)
    release(buffer)

    return {
        type: COMPLETE,
        value: result,
        nextIndex: ++i
    }
}
