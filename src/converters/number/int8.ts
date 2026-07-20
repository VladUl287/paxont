import { ConvertState, JsonReader, PrimitiveMeta } from "../../metadata/types"
import { JSONParseError } from "../../utils/error"
import { ReadResult, ReadResultType } from "../../utils/types"
import { isDigitUnsafe, MINUS } from "../../utils/utf8constants"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export const tryParseInt8 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseInt8(ctx.bytes, i, -128, 127, true)

export const tryParseUint8 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseInt8(ctx.bytes, i, 0, 255, false)

export function parseInt8(b: Uint8Array, i: number, minValue: number, maxValue: number, signed: boolean): ReadResult<number> {
    const MAX_DIGITS = 3

    const negative = signed && b[i] === MINUS
    if (negative) i++

    const len = Math.min(b.length, i + MAX_DIGITS)

    let m = 0 >>> 0
    if (i < len && isDigitUnsafe(b[i])) {
        m = m * 10 + (b[i++] & 0x0F)

        if (i < len && isDigitUnsafe(b[i])) {
            m = m * 10 + (b[i++] & 0x0F)

            if (i < len && isDigitUnsafe(b[i]))
                m = m * 10 + (b[i++] & 0x0F)
        }
    }
    
    if (negative) m = -m

    if (m < minValue || m > maxValue)
        throw new Error(`invalid i8 value ${m}, valid range ${minValue}-${maxValue}`)

    return {
        type: COMPLETE,
        value: m,
        nextIndex: i
    }
}
