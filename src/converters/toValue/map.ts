import { BaseMeta, JsonParsingContext, MapMeta, MetaValue } from "../../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN } from "../../utils/ascii_symbols"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../../utils/result"
import { JSONParseError } from "../../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toMap<M extends BaseMeta<any>>(meta: MapMeta<M>, context: JsonParsingContext): ReadResult<Map<string, MetaValue<M>>> {
    const { reader, options, stack, depth } = context
    const { bytes: b, bytesLength: len, writable, position } = reader

    let i = position
    let d = depth + 1

    if (d > options.maxDepth) {
        return {
            type: ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { metadata: meta, index: i, depth: d })
        }
    }
    d++

    const state = stack.pop()
    const isContinued: boolean = state?.isContinued ?? false
    const value: Map<string, MetaValue<M>> = state?.value ?? new Map()
    let hasComma = state?.hasComma ?? false

    if (!isContinued) {
        if (b[i] !== CURLY_OPEN) {
            if (writable && i >= len) {
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
            return {
                type: ERROR,
                error: new JSONParseError('Unexpected end of input', { metadata: meta, index: i, depth: d })
            }
        }
        i++

        if (b[i] === CURLY_CLOSE) {
            return {
                type: COMPLETE,
                value: value,
                nextIndex: ++i
            }
        }
    }
    else {
        i = reader.skipWhitespace(i)
        if (b[i] === COMMA) { i++; hasComma = true }
        else if (b[i] === CURLY_CLOSE) {
            if (hasComma) {
                return {
                    type: ERROR,
                    error: new JSONParseError('Trailing comma', { metadata: meta, index: i, depth: d })
                }
            }
            return {
                type: COMPLETE,
                value: value,
                nextIndex: ++i
            }
        }
    }

    const keyMeta = meta.key
    const parseKey = keyMeta.toValue
    const valueMeta = meta.value
    const parseValue = valueMeta.toValue

    let key: string | undefined = state?.key ?? undefined
    let colon: number | undefined = state?.colon ?? undefined
    while (true) {
        if (key === undefined) {
            i = reader.skipWhitespace(i)

            reader.setPosition(i)
            const result = parseKey(keyMeta, context)

            if (isError(result)) { return result }

            if (isNeedsMoreData(result)) {
                stack.push({ isContinued: true, value, hasComma })
                return result
            }

            key = result.value
            i = result.nextIndex
        }

        if (colon === undefined) {
            if (b[i] !== COLON) {
                if (i >= len && writable) {
                    stack.push({ isContinued: true, value, key })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: i
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError(`Expected ':' but found '${String.fromCharCode(b[i])}'`, { metadata: meta, index: i, depth: d })
                }
            }
            colon = i
            i++
        }

        i = reader.skipWhitespace(i)

        reader.setPosition(i)
        const result = parseValue(valueMeta, context)

        if (isError(result)) { return result }

        if (isNeedsMoreData(result)) {
            stack.push({ isContinued: true, value, key, colon })
            return result
        }

        value.set(key, result.value)
        key = colon = undefined

        i = reader.skipWhitespace(result.nextIndex)

        if (i >= len && writable) {
            stack.push({ isContinued: true, value })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        if (b[i] === COMMA) {
            hasComma = true
            i++
            continue
        }
        else if (b[i] === CURLY_CLOSE) { break }

        if (i >= len && writable) {
            stack.push({ isContinued: true, value })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        return {
            type: ERROR,
            error: new JSONParseError(`Expected '}' or ',' but found '${String.fromCharCode(b[i])}'`, { metadata: meta, index: i, depth: d })
        }
    }

    return {
        type: COMPLETE,
        value: value,
        nextIndex: ++i
    }
}
