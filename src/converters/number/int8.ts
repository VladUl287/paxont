import { ConvertState, JsonReader, PrimitiveMeta } from "../../metadata/types"
import { JSONParseError } from "../../utils/error"
import { ReadResult, ReadResultType } from "../../utils/types"
import { MINUS } from "../../utils/ascii_symbols"
import { isDigitUnsafe } from "../../utils/ascii"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export const toInt8 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> =>
    parseInt8(reader, index, -128, 127, true)

export const toUint8 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> =>
    parseInt8(reader, index, 0, 255, false)

function parseInt8(reader: JsonReader, i: number, minValue: number, maxValue: number, signed: boolean): ReadResult<number> {
    const b = reader.bytes
    const len = b.length
    const start = i

    if (i >= len && reader.writable) {
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: start
        }
    }

    const negative = signed && b[i] === MINUS
    if (negative) i++

    let m = 0 >>> 0
    if (i < len && isDigitUnsafe(b[i])) {
        m = m * 10 + (b[i++] & 0x0F)

        if (i < len && isDigitUnsafe(b[i])) {
            m = m * 10 + (b[i++] & 0x0F)

            if (i < len && isDigitUnsafe(b[i])) {
                m = m * 10 + (b[i++] & 0x0F)

                if (i < len && isDigitUnsafe(b[i]))
                    return {
                        type: ERROR,
                        error: new JSONParseError(``, i)
                    }
            }
        }
    }

    if (i >= len && reader.writable)
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: start
        }

    if (negative) m = -m

    if (m < minValue || m > maxValue)
        return {
            type: ERROR,
            error: new JSONParseError(``, i)
        }

    return {
        type: COMPLETE,
        value: m,
        nextIndex: i
    }
}
