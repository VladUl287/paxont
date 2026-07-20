import { BaseMeta, ArrayMeta, JsonReader, TypeName } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { copyArray, IndexableArray } from "../utils/array"
import { JSONParseError } from "../utils/error"

type BaseState = {
    isContinued: boolean
}

type ArrayState<T> = BaseState & {
    buffer?: IndexableArray<T>,
    bufferIndex?: number,
    itemState?: Record<string, any>
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
                error: new JSONParseError(`Expected '[' at index ${index}, but found '${b[index]}' while parsing array`, i)
            }
        }
        i++
    }

    const { rent, release } = metadata.arrayPool

    let buffer = state.buffer ?? rent(b.length - i)
    try {
        const itemMeta = metadata.value
        const tryParseItemValue = itemMeta.toValue

        const valueState = state.itemState ?? {}

        let j = state.bufferIndex ?? 0
        while (true) {
            i = skipWhitespace(b, i)

            const result = tryParseItemValue(reader, itemMeta, i, depth, valueState)

            if (isError(result) || isNeedsMoreData(result))
                return result

            buffer[j] = result.value
            index = result.nextIndex
            j++

            if (j >= buffer.length) {
                const newBuffer = copyArray(buffer, rent(buffer.length * 2))
                release(buffer)
                buffer = newBuffer
            }

            index = skipWhitespace(b, index)

            if (b[index] === COMMA) index++
            else if (b[index] === SQUARE_CLOSE) break
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
            nextIndex: ++index
        }
    }
    finally {
        release(buffer)
    }
}
