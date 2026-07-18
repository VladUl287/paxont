import { BaseMeta, ArrayMeta, JsonReader, TypeName } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { ReadResult, ReadResultType } from "../utils/types"
import { Indexable } from "../utils/array"

type BaseState = {
    isContinued: boolean
}

type ArrayState<T> = BaseState & {
    buffer?: ArrayLike<T>,
    bufferIndex?: number,
    lastState?: Record<string, any>
}

export function toArray<T, M extends BaseMeta<T, M>>(
    metadata: ArrayMeta<T, Indexable<T>, M>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ArrayState<T>,
): ReadResult<ArrayLike<T>> {
    if (depth > reader.options.maxDepth)
        return {
            type: ReadResultType.ERROR,
            error: new Error(''),
            nextIndex: index
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
            error: new Error(''),
            nextIndex: i
        }
    }

    if (!state.isContinued) {
        if (b[i] !== SQUARE_OPEN)
            throw new Error(`Expected '[' at index ${index}, but found '${b[index]}' while parsing array`)
        i++
    }

    const recycle = metadata.recycler.acquire 
    const buffer = recycle(1024)

    const meta = metadata.value
    const toValue = meta.toValue

    const valueState = state?.lastState ?? {}

    let j = state?.bufferIndex ?? 0
    while (true) {
        index = skipWhitespace(b, index)

        const result = toValue(reader, meta, index, depth, valueState)

        if (result.value === undefined) {
            if (state) {
                state.bufferIndex = j
                state.buffer = buffer
                state.lastState = valueState
            }
            return {
                nextIndex: index
            }
        }

        buffer[j] = result.value
        index = result.nextIndex
        j++

        // if (j >= buffer.length)
        //     buffer = factory(buffer.length * 2, buffer)

        index = skipWhitespace(b, index)

        if (b[index] === COMMA) index++
        else if (b[index] === SQUARE_CLOSE) break
        else throw new Error()
    }

    return {
        value: buffer.slice(0, j) as any,
        nextIndex: ++index
    }
}
