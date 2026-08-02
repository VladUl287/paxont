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
    index: number,
    depth: number,
): ReadResult<Map<string, T>> {
    const { reader, stack } = context
    const b = reader.bytes
    const len = b.length

    let i = index

    const state = stack.pop()
    if (!state || !state.isContinued) {
        if (b[i] !== CURLY_OPEN)
            return {
                type: ERROR,
                error: new JSONParseError(``)
            }
        i++
    }

    const result = new Map<string, T>()

    const keyMeta = metadata.key
    const tryParseKey = metadata.key.toValue
    const valueMeta = metadata.value
    const tryParseValue = valueMeta.toValue

    while (true) {
        i = skipWhitespace(b, i)

        let keyState = state?.keyState ?? {}
        if (state?.keyState)
            state.keyState = undefined

        const keyResult = tryParseKey(keyMeta, context, i, depth)

        if (isError(keyResult))
            return keyResult

        if (isNeedsMoreData(keyResult)) {
            stack.push({
                isContinued: true,
                keyState
            })
            return keyResult
        }

        i = keyResult.nextIndex

        if (i >= len) {
            if (reader.writable) {
                stack.push({ isContinued: true })
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
        }

        if (b[i] !== COLON) {
            return {
                type: ERROR,
                error: new JSONParseError('')
            }
        }
        i++

        i = skipWhitespace(b, i)

        let valueState = state?.valueState ?? {}
        if (state?.valueState)
            state.valueState = undefined

        const valueResult = tryParseValue(valueMeta, context, i, depth)

        if (isError(valueResult))
            return valueResult

        if (isNeedsMoreData(valueResult)) {
            stack.push({
                isContinued: true,
                valueState
            })
            return valueResult
        }

        i = valueResult.nextIndex

        result.set(keyResult.value, valueResult.value)

        i = skipWhitespace(b, i)

        if (b[i] === COMMA) i++
        else if (b[i] === CURLY_CLOSE) break
    }

    return {
        type: COMPLETE,
        value: result,
        nextIndex: ++i
    }
}
