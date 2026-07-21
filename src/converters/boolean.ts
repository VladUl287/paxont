import { JsonContext, PrimitiveMeta } from "../metadata/types"
import { E } from "../utils/ascii_symbols"
import { ReadResult, ReadResultType } from "../utils/types"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function tryParseBoolean(
    metadata: PrimitiveMeta<boolean>,
    context: JsonContext,
    index: number,
    depth: number
): ReadResult<boolean> {
    const reader = context.reader
    const b = reader.bytes
    const len = b.length
    
    let i = index
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

    if (reader.writable && (i + 3 >= len || i + 4 >= len))
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }

    return {
        type: ERROR,
        error: new JSONParseError(
            `Expected 'true' or 'false' at index ${i}, but found '${String.fromCharCode(b[i])}' while parsing boolean`, i)
    }
}
