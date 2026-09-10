import { JsonParsingContext, PrimitiveMeta } from "../../../metadata/types"
import { MINUS } from "../../../utils/ascii_symbols"
import { ReadResult, ReadResultType } from "../../../utils/result"
import { JSONParseError } from "../../../utils/error"
import { isDigitU } from "../../../utils/ascii"
import { JsonReader } from "../../../utils/reader"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export const toInt64 = (metadata: PrimitiveMeta<bigint>, { reader }: JsonParsingContext): ReadResult<bigint> =>
    parseInt64(reader, -9223372036854775808n, 9223372036854775807n, true)

export const toUint64 = (metadata: PrimitiveMeta<bigint>, { reader }: JsonParsingContext): ReadResult<bigint> =>
    parseInt64(reader, 0n, 18446744073709551615n, false)

export function toBigInt(metadata: PrimitiveMeta<bigint>, context: JsonParsingContext): ReadResult<bigint> {
    const { reader, options, stack } = context
    const { bytes: b, bytesLength: len, writable, position: start } = reader

    let i = start
    while (i < len - 4) {
        const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080
        if (hasNonDigit !== 0) break

        i += 4
    }

    while (i < len && isDigitU(b[i])) i++

    if (i >= len && writable) {
        stack.push({ isContinued: true })
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: start
        }
    }

    const length = i - start
    if (length <= 0) {
        return {
            type: ERROR,
            error: new JSONParseError(`Expected at least one digit`, { metadata, index: i })
        }
    }

    const decoder = options.decoder
    const view = new Uint8Array(b.buffer, start, length)
    return {
        type: COMPLETE,
        value: BigInt(decoder.decode(view)),
        nextIndex: i
    }
}

const bufferInt = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(bufferInt)
const conversionU64 = new BigUint64Array(bufferInt)

const POW10 = [1]
for (let i = 1; i <= 20; i++)
    POW10[i] = POW10[i - 1] * 10

export function parseInt64(reader: JsonReader, minValue: bigint, maxValue: bigint, signed: boolean): ReadResult<bigint> {
    const MAX_DIGITS = signed ? 19 : 20
    const MAX_SAFE_INT_DIGITS = 16 - 1

    const { bytes: b, bytesLength: bytesLen, writable, position } = reader
    const start = position
    let i = start

    const negative = signed && b[i] === MINUS
    if (negative) i++

    const len = Math.min(bytesLen, i + MAX_DIGITS)

    conversionU32[0] = 0
    conversionU32[1] = 0

    let temp = 0
    let dc = 0
    while (i < len && isDigitU(b[i])) {
        const d = (b[i] & 0x0F)

        if (dc < MAX_SAFE_INT_DIGITS) {
            temp = temp * 10 + d
        }
        else if (dc === MAX_SAFE_INT_DIGITS) {
            conversionU32[0] = temp >>> 0
            conversionU32[1] = Math.floor(temp / 0x100000000)
            temp = d
            dc = 0
        }

        dc++
        i++
    }

    if (temp > 0) {
        const pow = POW10[dc]
        const low = conversionU32[0] * pow + temp
        const carry = Math.floor(low / 0x100000000)
        conversionU32[0] = low >>> 0
        const newHigh = conversionU32[1] * pow + carry
        if (newHigh > 0xFFFFFFFF) {
            return {
                type: ERROR,
                error: new JSONParseError(`Invalid int value (must be between ${minValue} and ${maxValue})`, { index: i })
            }
        }
        conversionU32[1] = newHigh >>> 0
    }

    if (i >= len && writable) {
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: start
        }
    }

    const value = negative ? -conversionU64[0] : conversionU64[0]

    if (dc === 0 || value < minValue || value > maxValue) {
        return {
            type: ERROR,
            error: new JSONParseError(`Expected at least one digit`, { index: i })
        }
    }

    return {
        type: COMPLETE,
        value: value,
        nextIndex: i
    }
}
