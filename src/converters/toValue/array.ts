import { BaseMeta, ArrayMeta, JsonParsingContext, MetaValue } from "../../metadata/types"
import { COMMA, SPACE, SQUARE_CLOSE, SQUARE_OPEN } from "../../utils/ascii_symbols"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../../utils/result"
import { ArrayLikeWritable } from "../../utils/array"
import { JSONParseError } from "../../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA
const SP = SPACE, CM = COMMA, SQC = SQUARE_CLOSE, SQO = SQUARE_OPEN

export function toArray<A extends ArrayLikeWritable<MetaValue<M>>, M extends BaseMeta<any>>(
    metadata: ArrayMeta<A, M>, context: JsonParsingContext
): ReadResult<A> {
    const { reader, stack, options, depth } = context
    const { bytes: b, bytesLength: len, writable, position } = reader

    let i = position
    let d = depth + 1

    if (d > options.maxDepth) {
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { depth: d, index: i, metadata })
        }
    }
    context.setDepth(d)

    const { rent, release, clear } = metadata.pool

    const state = stack.pop()

    const isContinued: boolean = state?.isContinued ?? false
    const bufferIndex: number = state?.bufferIndex ?? 0
    const buffer: A = state?.buffer ?? rent(len - i)
    let inValue: boolean = state?.inValue ?? false

    const skipWhitespace = reader.skipWhitespace.bind(reader)

    if (isContinued) {
        if (b[i] === CM && !inValue) {
            i = skipWhitespace(++i)
        }
    }
    else {
        if (b[i] !== SQO) {
            if (writable && i >= len) {
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth: d, index: i, metadata })
            }
        }
        i++
    }

    if (b[i] === SQC) {
        return {
            type: COMPLETE,
            value: buffer.slice(0, bufferIndex),
            nextIndex: ++i
        }
    }

    const item = metadata.value
    const toValue = item.toValue

    let j = bufferIndex
    while (true) {
        (!inValue && !(b[i] > SP) && (i = skipWhitespace(i)))

        reader.setPosition(i)
        const result = toValue(item, context)

        if (isError(result)) {
            clear(buffer, 0, j)
            release(buffer)
            return result
        }

        if (isNeedsMoreData(result)) {
            stack.push({ isContinued: true, buffer, bufferIndex: j, inValue: result.nextIndex > i })
            return result
        }

        buffer[j] = result.value
        i = result.nextIndex
        inValue = false
        j++

        (!(b[i] > SP) && (i = skipWhitespace(i)))

        if (b[i] === CM) { i++; continue }
        else if (b[i] === SQC) { break }

        if (writable && i >= len) {
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

    const result = buffer.slice(0, j)
    clear(buffer, 0, j)
    release(buffer)

    context.setDepth(depth)
    return {
        type: COMPLETE,
        value: result,
        nextIndex: ++i
    }
}
