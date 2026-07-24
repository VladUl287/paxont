import { ConvertState, JsonReader, ParseContext, PrimitiveMeta } from "../../metadata/types"
import { MINUS } from "../../utils/ascii_symbols"
import { ReadResult, ReadResultType } from "../../utils/types"
import { JSONParseError } from "../../utils/error"
import { isDigitUnsafe } from "../../utils/ascii"

type BigIntState = ConvertState & { lastIndex?: number }

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export const toInt64 = (
    metadata: PrimitiveMeta<bigint>,
    reader: ParseContext,
    index: number,
    depth: number
): ReadResult<bigint> => parseInt64(reader.reader, index, -9223372036854775808n, 9223372036854775807n, true)

export const toUint64 = (
    metadata: PrimitiveMeta<bigint>,
    reader: ParseContext,
    index: number,
    depth: number
): ReadResult<bigint> => parseInt64(reader.reader, index, 0n, 18446744073709551615n, false)

export function toBigInt(
    metadata: PrimitiveMeta<bigint>,
    context: ParseContext,
    index: number,
    depth: number): ReadResult<bigint> {
    const reader = context.reader
    const b = reader.bytes
    const len = b.length

    let i = index
    let start = i
    // if (state.isContinued)
    //     i = state.lastIndex ?? i

    try {
        while (i < len - 4) {
            const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

            const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
            const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

            if (hasNonDigit !== 0) break

            i += 4
        }

        while (i < len && isDigitUnsafe(b[i])) i++

        // if (i === len && ctx.writable) {
        //     state.isContinued = true
        //     state.lastIndex = i

        //     return {
        //         type: NEEDS_MORE_DATA,
        //         nextIndex: start
        //     }
        // }

        const length = i - start
        if (length <= 0) {
            return {
                type: ERROR,
                error: new JSONParseError(
                    `Expected at least one digit at index ${i}, but found '${String.fromCharCode(b[i])}' while parsing bigint`)
            }
        }

        const decoder = context.options.decoder
        const view = new Uint8Array(b.buffer, start, i - start)
        return {
            type: COMPLETE,
            value: BigInt(decoder.decode(view)),
            nextIndex: i
        }
    }
    catch (error) {
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(
                `Unexpected error while parsing bigint at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error })
        }
    }
}

const bufferInt = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(bufferInt)
const conversionU64 = new BigUint64Array(bufferInt)

export function parseInt64(reader: JsonReader, i: number, minValue: bigint, maxValue: bigint, signed: boolean): ReadResult<bigint> {
    const MAX_DIGITS = 19
    const MAX_SAFE_INT_DIGITS = 16

    const b = reader.bytes

    const negative = signed && b[i] === MINUS
    if (negative) i++

    const len = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let temp = 0
    let dc = 0
    while (i < len) {
        const byte = b[i]

        if (!isDigitUnsafe(byte))
            break

        const d = byte & 0x0F
        if (dc < MAX_SAFE_INT_DIGITS) {
            temp = temp * 10 + d
        }
        else if (dc === MAX_SAFE_INT_DIGITS) {
            const high = Math.floor(temp / 0x100000000)
            const low = (temp) * 10 + temp
            conversionU32[0] = low >>> 0
            conversionU32[1] = high * 10 + Math.floor(low / 0x100000000)
            temp = 0
        }
        else {
            const low = conversionU32[0] * 10 + d
            conversionU32[0] = low >>> 0
            conversionU32[1] = conversionU32[1] * 10 + Math.floor(low / 0x100000000)
        }
        dc++
        i++
    }

    if (temp > 0) {
        conversionU32[0] = temp >>> 0
        conversionU32[1] = Math.floor(temp / 0x100000000)
    }

    const value = negative ? -conversionU64[0] : conversionU64[0]

    if (dc === 0 || value < minValue || value > maxValue)
        throw new Error(`invalid i64 value ${value}, at index ${i}. valid range ${minValue}-${maxValue}`)

    return {
        type: COMPLETE,
        value: value,
        nextIndex: i
    }
}
