import { BaseMeta, SetMeta, ParseContext } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/ascii_symbols"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toSet<V, M extends BaseMeta<V>>(
    metadata: SetMeta<M>,
    context: ParseContext,
    index: number,
    depth: number
): ReadResult<Set<V>> {
    const reader = context.reader
    const options = context.options

    if (depth > options.maxDepth)
        return {
            type: ERROR,
            error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${index}`)
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
            error: new JSONParseError(`Unexpected end of input at index ${i} while parsing array`)
        }
    }

    const stack = context.stack
    const state = stack.pop()

    let isContinued: boolean

    if (state !== undefined) {
        isContinued = state.isContinued
    }
    else {
        isContinued = false
    }

    if (!isContinued) {
        if (b[i] !== SQUARE_OPEN) return {
            type: ERROR,
            error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
        }
        i++

        if (i >= b.length && reader.writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i - 1
            }
        }

        if (b[i] === SQUARE_CLOSE) return {
            type: COMPLETE,
            value: new Set<V>(),
            nextIndex: ++i
        }
    }

    const set = state?.set ?? new Set<V>()
    const valueMeta = metadata.value

    const tryParseValue = valueMeta.toValue

    while (true) {
        i = skipWhitespace(b, i)

        const result = tryParseValue(valueMeta, context, i, depth)

        if (isError(result))
            return result

        if (isNeedsMoreData(result)) {
            stack.push({
                isContinued: true,
                set
            })
            return result
        }

        set.add(result.value)
        i = result.nextIndex

        i = skipWhitespace(b, i)

        if (b[i] === COMMA) i++
        else if (b[i] === SQUARE_CLOSE) break
        else {
            return {
                type: ERROR,
                error: new JSONParseError(`Unexpected end of value at index ${i} while parsing Set. Expected ']' or ',' as end of value`)
            }
        }
    }

    return {
        type: COMPLETE,
        value: set,
        nextIndex: ++i
    }
}
