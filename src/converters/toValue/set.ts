import { BaseMeta, SetMeta, JsonParsingContext, MetaValue } from "../../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../../utils/ascii_symbols"
import { skipWhitespace } from "../utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../../utils/result"
import { JSONParseError } from "../../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toSet<M extends BaseMeta<MetaValue<M>>>(
    metadata: SetMeta<M>,
    context: JsonParsingContext,
    i: number,
    d: number
): ReadResult<Set<MetaValue<M>>> {
    const { reader, options, stack } = context

    if (d > options.maxDepth) {
        return {
            type: ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { depth: d, index: i, metadata })
        }
    }

    const { bytes: b, bytesLength: len, writable } = reader

    const state = stack.pop()

    const isContinued = state?.isContinued ?? false
    const set: Set<MetaValue<M>> = state?.set ?? new Set<MetaValue<M>>()

    if (!isContinued) {
        if (b[i] !== SQUARE_OPEN) {
            if (i >= len && writable) {
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i - 1
                }
            }
            return {
                type: ERROR,
                error: new JSONParseError(`Expected '[' but found '${String.fromCharCode(b[i])}'`, { depth: d, index: i, metadata })
            }
        }
        i++

        if (b[i] === SQUARE_CLOSE) {
            return {
                type: COMPLETE,
                value: new Set<MetaValue<M>>(),
                nextIndex: ++i
            }
        }
    }
    else {
        if (b[i] === COMMA) { i++ }
        else if (b[i] === SQUARE_CLOSE) {
            if (state?.hasComma) {
                return {
                    type: ERROR,
                    error: new JSONParseError(`Trailing comma`)
                }
            }
            return {
                type: COMPLETE,
                value: set,
                nextIndex: ++i
            }
        }
    }

    const keySelector = metadata.key
    const itemMeta = metadata.value
    const toValue = itemMeta.toValue

    let hasComma = false
    let keySet: Set<any> | undefined = state?.keySet
    while (true) {
        i = skipWhitespace(b, i)

        const result = toValue(itemMeta, context, i, d)

        if (isError(result))
            return result

        if (isNeedsMoreData(result)) {
            stack.push({ isContinued: true, set, keySet, hasComma })
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

        if (b[i] === COMMA) {
            i++
            hasComma = true
            continue
        }
        else if (b[i] === SQUARE_CLOSE) { break }

        if (i >= len && writable) {
            stack.push({ isContinued: true, set, keySet })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        return {
            type: ERROR,
            error: new JSONParseError(`Expected ']' or ',' but found '${String.fromCharCode(b[i])}'`, { depth: d, index: i, metadata })
        }
    }

    return {
        type: COMPLETE,
        value: set,
        nextIndex: ++i
    }
}
