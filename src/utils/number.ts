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
        throw new Error(`invalid u8 value ${m}, valid range ${MIN_VALUE}-${MAX_VALUE}`)

    return m
}

export function parseNumberU8(b: Uint8Array, i: number): number { return 1 }

export function parseNumberI16(b: Uint8Array, i: number): number { return 1 }

export function parseNumberU16(b: Uint8Array, i: number): number { return 1 }

export function parseNumberI32(b: Uint8Array, i: number): number { return 1 }

export function parseNumberU32(b: Uint8Array, i: number): number { return 1 }

export function parseNumberF32(b: Uint8Array, i: number): number { return 1 }

export function parseNumberF64(b: Uint8Array, i: number): number { return 1 }

export function parseNumberI64(b: Uint8Array, i: number): bigint { return 1n }

export function parseNumberU64(b: Uint8Array, i: number): bigint { return 1n }
