import { ConvertState, JsonReader, PrimitiveMeta } from "../../metadata/types"
import { JSONParseError } from "../../utils/error"
import { ReadResult, ReadResultType } from "../../utils/types"
import { isDigitUnsafe, MINUS } from "../../utils/utf8constants"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export const tryParseInt8 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> => tryParseInt(reader, index, 3, -128, 127, true)

export const tryParseUint8 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> => tryParseInt(reader, index, 3, 0, 255, false)

export const tryParseInt16 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> => tryParseInt(reader, index, 5, -32768, 32767, true)

export const tryParseUint16 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> => tryParseInt(reader, index, 5, 0, 65535, false)

export const tryParseInt32 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> => tryParseInt(reader, index, 10, -2147483648, 2147483647, true)

export const tryParseUint32 = (
    metadata: PrimitiveMeta<number>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<number> => tryParseInt(reader, index, 10, 0, 4294967295, false)

function tryParseInt(
    reader: JsonReader,
    i: number,
    maxDigits: number,
    minValue: number,
    maxValue: number,
    signed: boolean
): ReadResult<number> {
    const b = reader.bytes
    const len = b.length

    const negative = signed && b[i] === MINUS
    if (negative) i++

    const start = i

    let m = 0 >>> 0

    const length = Math.min(len, i + maxDigits)
    while (i < length && isDigitUnsafe(b[i]))
        m = m * 10 + (b[i++] & 0x0F)

    if (i < len && isDigitUnsafe(b[i]))
        return {
            type: ERROR,
            error: new JSONParseError(``, i)
        }

    if (i >= len && reader.writable)
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: start
        }

    if (negative) m = -m

    if (m < minValue || m > maxValue) {
        return {
            type: ERROR,
            error: new JSONParseError(``, i)
        }
    }

    return {
        type: COMPLETE,
        value: m,
        nextIndex: i
    }
}
