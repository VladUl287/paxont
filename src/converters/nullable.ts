import { BaseMeta, ConvertState, JsonReader, NullableMeta } from "../metadata/types"
import { ReadResult } from "../utils/types"
import { L, N, U } from "../utils/utf8constants"

const NULL = N | U << 8 | L << 16 | L << 24

export function toNullable<T, M extends BaseMeta<T, M>>(
    m: NullableMeta<T, M>,
    reader: JsonReader,
    i: number,
    d: number,
    s: ConvertState
): ReadResult<T | null> {
    const b = reader.bytes
    const len = b.length

    if (i + 3 < len && (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) === NULL)
        return {
            value: null,
            nextIndex: i + 4
        }

    return m.value.toValue(reader, m.value, i, d)
}
