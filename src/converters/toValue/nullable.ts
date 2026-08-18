import { BaseMeta, JsonParsingContext, NullableMeta, MetaValue } from "../../metadata/types"
import { ReadResult, ReadResultType } from "../../utils/types"
import { L, N, U } from "../../utils/ascii_symbols"

const NULL = N | U << 8 | L << 16 | L << 24

const COMPLETE = ReadResultType.COMPLETE
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toNullable<M extends BaseMeta<any>>(
    { value }: NullableMeta<M>,
    context: JsonParsingContext,
    index: number,
    depth: number
): ReadResult<MetaValue<M> | null> {
    const reader = context.reader
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

    return value.toValue(value, context, i, depth)
}
