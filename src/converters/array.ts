import { BaseMeta, ArrayMeta, JsonReader, TypeName, ConvertState } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { copyArray, IndexableArray } from "../utils/array"
import { JSONParseError } from "../utils/error"

type ArrayState<T> = ConvertState & {
    buffer?: IndexableArray<T>,
    bufferIndex?: number,
    itemState?: ConvertState
}

export function toArray<T, M extends BaseMeta<T, M>>(
    metadata: ArrayMeta<T, IndexableArray<T>, M>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ArrayState<T>,
): ReadResult<ArrayLike<T>> {
    if (depth > reader.options.maxDepth)
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError('', index)
        }

    const b = reader.bytes
    const len = b.length

    let i = index
    if (i >= len) {
        if (reader.writable)
            return {
                type: ReadResultType.NEEDS_MORE_DATA,
                nextIndex: i
            }

        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError('', i)
        }
    }

    if (!state.isContinued) {
        if (b[i] !== SQUARE_OPEN) {
            return {
                type: ReadResultType.ERROR,
                error: new JSONParseError(`Expected '[' at index ${i}, but found '${b[i]}' while parsing array`, i)
            }
        }
        i++
    }

    const { rent, release } = metadata.arrayPool

    let buffer = state.buffer ?? rent(b.length - i)
    try {
        const itemMeta = metadata.value
        const tryParseItemValue = itemMeta.toValue

        const itemState = state.itemState ?? { isContinued: false }

        let j = state.bufferIndex ?? 0
        while (true) {
            i = skipWhitespace(b, i)

            const result = tryParseItemValue(itemMeta, reader, i, depth, itemState)

            if (isError(result))
                return result

            if (isNeedsMoreData(result)) {
                state.isContinued = true
                state.buffer = buffer
                state.bufferIndex = j
                state.itemState = {
                    ...itemState,
                    isContinued: true
                }
                return result
            }

            buffer[j] = result.value
            i = result.nextIndex
            j++

            if (j >= buffer.length) {
                const newBuffer = copyArray(buffer, rent(buffer.length * 2))
                release(buffer)
                buffer = newBuffer
            }

            i = skipWhitespace(b, i)

            if (b[i] === COMMA) i++
            else if (b[i] === SQUARE_CLOSE) break
            else {
                return {
                    type: ReadResultType.ERROR,
                    error: new JSONParseError('', i)
                }
            }
        }

        return {
            type: ReadResultType.COMPLETE,
            value: buffer.slice(0, j),
            nextIndex: ++i
        }
    }
    finally {
        release(buffer)
    }
}
