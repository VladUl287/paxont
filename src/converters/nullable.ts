import { BaseMeta, ConvertState, JsonReader, NullableMeta } from "../metadata/types"
import { isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { L, N, U } from "../utils/utf8constants"

const NULL = N | U << 8 | L << 16 | L << 24

const COMPLETE = ReadResultType.COMPLETE
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

type NullableState = ConvertState & {
    valueState?: ConvertState
}

export function tryParseNullable<T, M extends BaseMeta<T, M>>(
    metadata: NullableMeta<T, M>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: NullableState
): ReadResult<T | null> {
    const b = reader.bytes
    const len = b.length

    let i = index
    if (i + 3 < len && (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) === NULL)
        return {
            type: COMPLETE,
            value: null,
            nextIndex: i + 4
        }

    if (i + 3 >= len && reader.writable)
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }

    const metaValue = metadata.value
    const valueState = state.valueState ?? {}
    const result = metaValue.tryParseValue(metaValue, reader, i, depth, valueState)

    if (isNeedsMoreData(result)) {
        state.isContinued = true
        state.valueState = valueState
    }

    return result
}
