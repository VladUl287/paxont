import { ConvertResult } from "../metadata/types"
import { isDigitU8, MINUS } from "./utf8constants"

type NumberFormat = {
    normalMantissaBits: number
    denormalMantissaBits: number
    exponentBias: number
    maxBinaryExponent: number
    minBinaryExponent: number
    exponentBits: number
    normalMantissaMask: bigint
    denormalMantissaMask: bigint
    zeroBits: number
    overflowDecimalExponent: number
}

export const f64Format: NumberFormat = {
    normalMantissaBits: 53,
    denormalMantissaBits: 52,
    exponentBias: 1023,
    maxBinaryExponent: 1023,
    minBinaryExponent: -1022,
    exponentBits: 11,
    normalMantissaMask: (1n << 53n) - 1n,
    denormalMantissaMask: (1n << 52n) - 1n,
    zeroBits: 0,
    overflowDecimalExponent: 324
}

export const f32Format: NumberFormat = {
    normalMantissaBits: 53,
    denormalMantissaBits: 52,
    exponentBias: 1023,
    maxBinaryExponent: 1023,
    minBinaryExponent: -1022,
    exponentBits: 11,
    normalMantissaMask: (1n << 53n) - 1n,
    denormalMantissaMask: (1n << 52n) - 1n,
    zeroBits: 0,
    overflowDecimalExponent: 324
}

export function parseNumber(b: Uint8Array, i: number, format: NumberFormat): ConvertResult<number> {
    return {
        value: 1,
        nextIndex: 1
    }
}

export function parseInt8(b: Uint8Array, i: number): number {
    const MAX_DIGITS = 3
    const MIN_VALUE = -128
    const MAX_VALUE = 127

    const negative = b[i] === MINUS
    if (negative) i++

    const length = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let m = 0 >>> 0
    if (i < length && isDigitU8(b[i])) {
        m = m * 10 + (b[i++] & 0x0F)

        if (i < length && isDigitU8(b[i])) {
            m = m * 10 + (b[i++] & 0x0F)

            if (i < length && isDigitU8(b[i]))
                m = m * 10 + (b[i++] & 0x0F)
        }
    }

    m = negative ? -m : m

    const dc = i - start
    if (dc > MAX_DIGITS || m < MIN_VALUE || m > MAX_VALUE)
        throw new Error(`invalid i8 value ${m}, valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseUint8(b: Uint8Array, i: number): number {
    const MAX_DIGITS = 3
    const MIN_VALUE = 0
    const MAX_VALUE = 255

    const length = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let m = 0 >>> 0
    if (i < length && isDigitU8(b[i])) {
        m = m * 10 + (b[i++] & 0x0F)

        if (i < length && isDigitU8(b[i])) {
            m = m * 10 + (b[i++] & 0x0F)

            if (i < length && isDigitU8(b[i]))
                m = m * 10 + (b[i++] & 0x0F)
        }
    }

    const dc = i - start
    if (dc > MAX_DIGITS || m < MIN_VALUE || m > MAX_VALUE)
        throw new Error(`invalid u8 value ${m}, valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseInt16(b: Uint8Array, i: number): number {
    const MAX_DIGITS = 5
    const MIN_VALUE = -32768
    const MAX_VALUE = 32767

    const negative = b[i] === MINUS
    if (negative) i++

    const length = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let m = 0 >>> 0
    if (i < length && isDigitU8(b[i])) {
        m = m * 10 + (b[i++] & 0x0F)

        if (i < length && isDigitU8(b[i])) {
            m = m * 10 + (b[i++] & 0x0F)

            if (i < length && isDigitU8(b[i])) {
                m = m * 10 + (b[i++] & 0x0F)

                if (i < length && isDigitU8(b[i])) {
                    m = m * 10 + (b[i++] & 0x0F)

                    if (i < length && isDigitU8(b[i]))
                        m = m * 10 + (b[i++] & 0x0F)
                }
            }
        }
    }

    m = negative ? -m : m

    const dc = i - start
    if (dc > MAX_DIGITS || m < MIN_VALUE || m > MAX_VALUE)
        throw new Error(`invalid i16 value ${m}, valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseUint16(b: Uint8Array, i: number): number {
    const MAX_DIGITS = 5
    const MIN_VALUE = 0
    const MAX_VALUE = 65535

    const length = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let m = 0 >>> 0
    if (i < length && isDigitU8(b[i])) {
        m = m * 10 + (b[i++] & 0x0F)

        if (i < length && isDigitU8(b[i])) {
            m = m * 10 + (b[i++] & 0x0F)

            if (i < length && isDigitU8(b[i])) {
                m = m * 10 + (b[i++] & 0x0F)

                if (i < length && isDigitU8(b[i])) {
                    m = m * 10 + (b[i++] & 0x0F)

                    if (i < length && isDigitU8(b[i]))
                        m = m * 10 + (b[i++] & 0x0F)
                }
            }
        }
    }

    const dc = i - start
    if (dc > MAX_DIGITS || m < MIN_VALUE || m > MAX_VALUE)
        throw new Error(`invalid u16 value ${m}, valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseNumberI32(b: Uint8Array, i: number): number {
    const MAX_DIGITS = 10
    const MIN_VALUE = -2147483648
    const MAX_VALUE = 2147483647

    const negative = b[i] === MINUS
    if (negative) i++

    const length = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let m = 0 >>> 0
    while (i < length && isDigitU8(b[i]))
        m = m * 10 + (b[i++] & 0x0F)

    m = negative ? -m : m

    const dc = i - start
    if (dc > MAX_DIGITS || m < MIN_VALUE || m > MAX_VALUE)
        throw new Error(`invalid i32 value ${m}, valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseNumberU32(b: Uint8Array, i: number): number {
    const MAX_DIGITS = 10
    const MIN_VALUE = 0
    const MAX_VALUE = 4294967295

    const length = Math.min(b.length, i + MAX_DIGITS)
    const start = i

    let m = 0 >>> 0
    while (i < length && isDigitU8(b[i]))
        m = m * 10 + (b[i++] & 0x0F)

    const dc = i - start
    if (dc === 0 || dc > MAX_DIGITS || m < MIN_VALUE || m > MAX_VALUE)
        throw new Error(`invalid u32 value ${m}, at index ${i}. valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseNumberF32(b: Uint8Array, i: number): number { return 1 }

export function parseNumberF64(b: Uint8Array, i: number): number { return 1 }

const bufferInt = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(bufferInt)
const conversionU64 = new BigUint64Array(bufferInt)
export function parseNumberI64(b: Uint8Array, i: number, r: BigInt64Array, rIndex: number): number {
    const MAX_DIGITS = 19
    const MAX_SAFE_INT_DIGITS = 16
    const MIN_VALUE = -9223372036854775808n
    const MAX_VALUE = 9223372036854775807n

    const negative = b[i] === MINUS
    if (negative) i++

    const length = Math.min(b.length, i + MAX_DIGITS)

    let temp = 0
    let dc = 0
    while (i < length) {
        const d = (b[i] - 48) >>> 0
        if (d > 9) break

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

        i++
    }

    if (temp > 0) {
        conversionU32[0] = temp >>> 0
        conversionU32[1] = Math.floor(temp / 0x100000000)
    }

    const value = negative ? -conversionU64[0] : conversionU64[0]

    if (dc === 0 || dc > MAX_DIGITS || value < MIN_VALUE || value > MAX_VALUE)
        throw new Error(`invalid i64 value ${value}, at index ${i}. valid range ${MIN_VALUE}-${MAX_VALUE}`)

    r[rIndex] = value
    return i
}

export function parseNumberU64(b: Uint8Array, i: number, r: BigUint64Array, rIndex: number): number {
    const MAX_DIGITS = 20
    const MAX_SAFE_INT_DIGITS = 16
    const MIN_VALUE = 0
    const MAX_VALUE = 18446744073709551615n

    const length = Math.min(b.length, i + MAX_DIGITS)

    let temp = 0
    let dc = 0
    while (i < length) {
        const d = (b[i] - 48) >>> 0
        if (d > 9) break

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

        i++
    }

    if (temp > 0) {
        conversionU32[0] = temp >>> 0
        conversionU32[1] = Math.floor(temp / 0x100000000)
    }

    const value = conversionU64[0]

    if (dc === 0 || dc > MAX_DIGITS || value < MIN_VALUE || value > MAX_VALUE)
        throw new Error(`invalid u64 value ${value}, at index ${i}. valid range ${MIN_VALUE}-${MAX_VALUE}`)

    r[rIndex] = value
    return i
}
