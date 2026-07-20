import { ConvertState, JsonReader, PrimitiveMeta } from "../metadata/types"
import { E } from "../utils/utf8constants"
import { ReadResult, ReadResultType } from "../utils/types"

const COMPLETE = ReadResultType.COMPLETE
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function tryParseBoolean(
    _m: PrimitiveMeta<boolean>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<boolean> {
    const b = ctx.bytes
    const len = b.length

    let ch = 0

    const TRUE = 0x65757274
    if (i + 3 < len && (ch = (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24)) === TRUE)
        return {
            type: COMPLETE,
            value: true,
            nextIndex: i + 4
        }

    const FALSE = 0x736c6166
    if (i + 4 < len && ch === FALSE && b[i + 4] === E)
        return {
            type: COMPLETE,
            value: false,
            nextIndex: i + 5
        }

    if (ctx.writable && (i + 3 >= len || i + 4 >= len))
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }

    throw new Error(`Expected 'true' or 'false' at index ${i}, but found '${String.fromCharCode(b[i])}' while parsing boolean`)
}
