import { BaseMeta, ConvertState, JsonReader, MapMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN, DOUBLE_QUOTE } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

type MapState = ConvertState & {
    keyState?: ConvertState,
    valueState?: ConvertState
}

export function tryParseMap<T, M extends BaseMeta<T, M>>(
    metadata: MapMeta<T, M>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: MapState
): ReadResult<Map<string, T>> {
    const b = reader.bytes
    const len = b.length

    let i = index

    if (!state.isContinued) {
        if (b[i] !== CURLY_OPEN)
            return {
                type: ERROR,
                error: new JSONParseError(``, i)
            }
        i++
    }

    const result = new Map<string, T>()

    const keyMeta = metadata.key
    const tryParseKey = metadata.key.tryParseValue
    const valueMeta = metadata.value
    const tryParseValue = valueMeta.tryParseValue

    while (true) {
        i = skipWhitespace(b, i)

        let keyState = state.keyState ?? {}
        if (state.keyState)
            state.keyState = undefined

        const keyResult = tryParseKey(keyMeta, reader, i, depth, keyState)

        if (isError(keyResult))
            return keyResult

        if (isNeedsMoreData(keyResult)) {
            state.isContinued = true
            state.keyState = keyState
            return keyResult
        }

        i = keyResult.nextIndex

        if (i >= len) {
            if (reader.writable) {
                state.isContinued = true
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
        }

        if (b[i] !== COLON) {
            return {
                type: ERROR,
                error: new JSONParseError('', i)
            }
        }
        i++

        i = skipWhitespace(b, i)

        let valueState = state.valueState ?? {}
        if (state.valueState)
            state.valueState = undefined

        const valueResult = tryParseValue(valueMeta, reader, i, depth, valueState)

        if (isError(valueResult))
            return valueResult

        if (isNeedsMoreData(valueResult)) {
            state.isContinued = true
            state.valueState = valueState
            return valueResult
        }

        i = valueResult.nextIndex

        result.set(keyResult.value, valueResult.value)

        i = skipWhitespace(b, i)

        if (b[i] === COMMA || b[i] === CURLY_CLOSE)
            break
    }

    return {
        type: COMPLETE,
        value: result,
        nextIndex: ++i
    }
}
