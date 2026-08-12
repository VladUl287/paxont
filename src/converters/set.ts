import { BaseMeta, SetMeta, JsonParsingContext, MetaValue } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/ascii_symbols"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toSet<M extends BaseMeta<MetaValue<M>>>(
    metadata: SetMeta<M>,
    context: JsonParsingContext,
    i: number,
    depth: number
): ReadResult<Set<MetaValue<M>>> {
    const { reader, options, stack } = context

    if (depth > options.maxDepth) {
        return {
            type: ERROR,
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

    const isContinued = state?.isContinued ?? false
    const set: Set<MetaValue<M>> = state?.set ?? new Set<MetaValue<M>>()
    let keySet: Set<any> | undefined = state?.keySet

    if (!isContinued) {
        if (b[i] !== SQUARE_OPEN) {
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
            }
        }
        i++

        if (i >= b.length && reader.writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i - 1
            }
        }

        if (b[i] === SQUARE_CLOSE) {
            return {
                type: COMPLETE,
                value: new Set<MetaValue<M>>(),
                nextIndex: ++i
            }
        }
    }

    const keySelector = metadata.key
    const itemMeta = metadata.value
    const toValue = itemMeta.toValue

    while (true) {
        i = skipWhitespace(b, i)

        if (b[i] === COMMA) { i++ }
        else if (b[i] === SQUARE_CLOSE) { break }

        const result = toValue(itemMeta, context, i, depth)

        if (isError(result))
            return result

        if (isNeedsMoreData(result)) {
            stack.push({ isContinued: true, set, keySet })
            return result
        }

        if (keySelector) {
            keySet ??= new Set()

            const key = keySelector(result.value)
            if (!keySet.has(key)) {
                keySet.add(key)
                set.add(result.value)
            }
        }
        else {
            set.add(result.value)
        }

        i = skipWhitespace(b, result.nextIndex)

        if (b[i] === COMMA) { i++ }
        else if (b[i] === SQUARE_CLOSE) { break }
        else if (i >= b.length && reader.writable) {
            stack.push({ isContinued: true, set, keySet })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        else {
            return {
                type: ERROR,
                error: new JSONParseError(`Expected ']' or ',' but found '${String.fromCharCode(b[i])}'`, { depth, index: i, metadata })
            }
        }
    }

    return {
        type: COMPLETE,
        value: set,
        nextIndex: ++i
    }
}
