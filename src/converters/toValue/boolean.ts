import { JsonParsingContext, PrimitiveMeta } from "../../metadata/types"
import { ReadResult, ReadResultType } from "../../utils/result"
import { JSONParseError } from "../../utils/error"
import { E } from "../../utils/ascii_symbols"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toBoolean(meta: PrimitiveMeta<boolean>, context: JsonParsingContext): ReadResult<boolean> {
    const { reader: { bytes: b, bytesLength: bytesLen, writable, position } } = context
    let i = position

    let ch = 0
    const TRUE = 0x65757274
    if (i + 3 < bytesLen && (ch = (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24)) === TRUE) {
        return {
            type: COMPLETE,
            value: true,
            nextIndex: i + 4
        }
    }

    const FALSE = 0x736c6166
    if (i + 4 < bytesLen && ch === FALSE && b[i + 4] === E) {
        return {
            type: COMPLETE,
            value: false,
            nextIndex: i + 5
        }
    }

    if (writable && (i + 3 >= bytesLen || i + 4 >= bytesLen)) {
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }
    }
    return {
        type: ERROR,
        error: new JSONParseError(`Expected 'true' or 'false' but found '${String.fromCharCode(b[i])}'`, { metadata: meta, index: i })
    }
}
