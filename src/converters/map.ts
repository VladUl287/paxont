import { BaseMeta, ParseContext, MapMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN } from "../utils/ascii_symbols"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toMap<T, M extends BaseMeta<T, M>>(
    metadata: MapMeta<M>,
    context: ParseContext,
    i: number,
    depth: number,
): ReadResult<Map<string, T>> {
    const { reader, stack, options } = context

    if (depth > options.maxDepth) {
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { depth, index: i, metadata })
        }
    }

    const state = stack.pop()

    let isContinued: boolean = state?.isContinued ?? false
    let value: Map<string, T> = state?.value ?? new Map<string, T>()
    let keyValue: string | undefined = state?.keyValue ?? undefined
    let colonIndex: number | undefined = state?.colonIndex ?? undefined

    const b = reader.bytes
    if (i >= b.length) {
        if (reader.writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input`, {})
        }
    }

    let commaIndex = -1
    if (!isContinued) {
        if (b[i] !== CURLY_OPEN) {
            return {
                type: ERROR,
                error: new JSONParseError(``)
            }
        }
        i++
    }
    else {
        i = skipWhitespace(b, i)
        if (b[i] === COMMA) {
            commaIndex = i
            i++
        }
        else if (b[i] === CURLY_CLOSE) {
            return {
                type: COMPLETE,
                value: value,
                nextIndex: ++i
            }
        }
    }

    if (i >= b.length && reader.writable) {
        stack.push({
            isContinued: true,
            value
        })
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }
    }

    if (b[i] === CURLY_CLOSE) {
        return {
            type: COMPLETE,
            value: value,
            nextIndex: ++i
        }
    }

    const keyMeta = metadata.key
    const tryParseKey = metadata.key.toValue
    const valueMeta = metadata.value
    const tryParseValue = valueMeta.toValue

    while (true) {
        if (!keyValue) {
            i = skipWhitespace(b, i)

            const keyResult = tryParseKey(keyMeta, context, i, depth)

            if (isError(keyResult))
                return keyResult

            if (isNeedsMoreData(keyResult)) {
                stack.push({
                    isContinued: true,
                    value
                })
                return keyResult
            }

            i = keyResult.nextIndex
            keyValue = keyResult.value
        }

        if (colonIndex === undefined) {
            if (b[i] !== COLON) {
                if (i >= b.length && reader.writable) {
                    stack.push({
                        isContinued: true,
                        value,
                        keyValue
                    })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: i
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError('')
                }
            }
            i++
            colonIndex = i
        }

        i = skipWhitespace(b, i)

        const valueResult = tryParseValue(valueMeta, context, i, depth)

        if (isError(valueResult))
            return valueResult

        if (isNeedsMoreData(valueResult)) {
            stack.push({
                isContinued: true,
                value,
                keyValue,
                colonIndex
            })
            return valueResult
        }

        i = valueResult.nextIndex

        value.set(keyValue, valueResult.value)

        i = skipWhitespace(b, i)

        keyValue = undefined
        colonIndex = undefined

        if (i >= b.length && reader.writable) {
            stack.push({
                isContinued: true,
                value
            })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        if (b[i] === COMMA) {
            commaIndex = i
            i++
            continue
        }

        commaIndex = -1

        if (b[i] === CURLY_CLOSE) { break }
        else if (i >= b.length) {
            if (reader.writable) {
                stack.push({
                    isContinued: true,
                    value
                })
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
            return {
                type: ERROR,
                error: new JSONParseError('')
            }
        }

        return {
            type: ERROR,
            error: new JSONParseError('')
        }
    }

    if (commaIndex >= 0) {
        return {
            type: ERROR,
            error: new JSONParseError('Trail comma')
        }
    }

    return {
        type: COMPLETE,
        value: value,
        nextIndex: ++i
    }
}
