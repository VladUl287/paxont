import { JsonParsingContext, PrimitiveMeta } from "../../metadata/types"
import { ReadResult, ReadResultType } from "../../utils/result"
import { JSONParseError } from "../../utils/error"
import { E } from "../../utils/ascii_symbols"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toBoolean(
    m: PrimitiveMeta<boolean>,
    { reader: { bytes: b, writable } }: JsonParsingContext,
    i: number, d: number
): ReadResult<boolean> {
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

    if (writable && (i + 3 >= len || i + 4 >= len))
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }

    return {
        type: ERROR,
        error: new JSONParseError(`Expected 'true' or 'false' but found '${String.fromCharCode(b[i])}'`, { metadata: m, index: i, depth: d })
    }
}
