import { ReadResult, ReadResultType } from "../../utils/types"
import { MINUS } from "../../utils/ascii_symbols"
import { float64, FloatFormat } from "./floatFormats"

const POS_POW10 = [1]
const POW10 = [1n]
for (let i = 1; i <= 308; i++) {
    POS_POW10[i] = POS_POW10[i - 1] * 10
    POW10[i] = POW10[i - 1] * 10n
}
const POW2 = new Array(2046)
for (let exp = -1022; exp <= 1023; exp++) {
    POW2[exp + 1022] = Math.pow(2, exp)
}

const MAX_DIGITS_COUNT = 753

const bufferMantissa = new ArrayBuffer(8)
const mantissaU32 = new Uint32Array(bufferMantissa)

const bufferConversion = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(bufferConversion)
const conversionU64 = new BigUint64Array(bufferConversion)
const conversionF64 = new Float64Array(bufferConversion)

type Swar = {
    memory: WebAssembly.Memory,
    get_digits: Function
}

type BigInteger = {
    memory: WebAssembly.Memory,
    init: Function
    add: Function
    mul: Function
}

const wasmMemory = new WebAssembly.Memory({
    initial: 1,
    maximum: 1
})

const swar = new WebAssembly.Instance(
    new WebAssembly.Module(
        new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 2, 127, 127, 0, 2, 15, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 0, 1, 3, 2, 1, 0, 6, 11, 2, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 7, 23, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 103, 101, 116, 95, 100, 105, 103, 105, 116, 115, 0, 0, 10, 131, 2, 1, 128, 2, 3, 6, 127, 3, 123, 2, 127, 65, 0, 33, 11, 65, 0, 33, 12, 32, 0, 33, 2, 65, 0, 33, 6, 65, 0, 33, 7, 65, 0, 33, 3, 2, 64, 3, 64, 32, 3, 32, 1, 65, 16, 107, 77, 4, 64, 32, 3, 253, 0, 4, 0, 33, 8, 32, 8, 253, 12, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 253, 113, 33, 9, 32, 9, 253, 12, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 253, 42, 33, 10, 32, 10, 253, 99, 69, 13, 2, 32, 2, 32, 9, 253, 11, 4, 0, 32, 3, 65, 16, 106, 33, 3, 32, 2, 65, 16, 106, 33, 2, 32, 6, 65, 16, 106, 33, 6, 12, 1, 5, 12, 2, 11, 11, 11, 2, 64, 3, 64, 32, 3, 32, 1, 79, 13, 1, 32, 0, 32, 3, 106, 45, 0, 0, 33, 4, 32, 4, 65, 48, 107, 65, 9, 77, 4, 64, 32, 4, 65, 48, 71, 32, 11, 114, 4, 64, 32, 4, 65, 15, 113, 33, 5, 65, 1, 33, 11, 32, 12, 69, 4, 64, 32, 7, 65, 1, 106, 33, 7, 11, 32, 2, 32, 5, 58, 0, 0, 32, 6, 65, 1, 106, 34, 6, 33, 2, 5, 32, 12, 4, 64, 32, 7, 65, 1, 107, 33, 7, 11, 11, 32, 3, 65, 1, 106, 33, 3, 12, 1, 5, 12, 2, 11, 11, 11, 11
        ])
    ), { env: { memory: wasmMemory } }).exports as Swar

console.log(swar)

const instance = new WebAssembly.Instance(
    new WebAssembly.Module(
        new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 3, 96, 1, 127, 0, 96, 1, 127, 1, 127, 96, 0, 0, 3, 5, 4, 0, 1, 1, 2, 5, 3, 1, 0, 1, 7, 37, 5, 6, 109, 101, 109, 111, 114, 121, 2, 0, 4, 105, 110, 105, 116, 0, 0, 3, 97, 100, 100, 0, 1, 3, 109, 117, 108, 0, 2, 5, 114, 101, 115, 101, 116, 0, 3, 10, 194, 2, 4, 16, 0, 65, 0, 65, 1, 54, 2, 0, 65, 4, 32, 0, 54, 2, 0, 11, 142, 1, 3, 3, 127, 2, 126, 1, 127, 65, 0, 33, 1, 32, 1, 40, 2, 0, 33, 2, 32, 0, 173, 33, 4, 65, 0, 33, 3, 3, 64, 2, 64, 32, 3, 32, 2, 79, 32, 4, 80, 114, 13, 0, 32, 1, 65, 4, 106, 32, 3, 65, 4, 108, 106, 40, 2, 0, 173, 32, 4, 124, 33, 5, 32, 1, 65, 4, 106, 32, 3, 65, 4, 108, 106, 32, 5, 167, 54, 2, 0, 32, 5, 66, 32, 136, 33, 4, 32, 3, 65, 1, 106, 33, 3, 12, 1, 11, 11, 32, 4, 66, 0, 82, 4, 64, 32, 2, 65, 1, 106, 33, 6, 32, 1, 32, 6, 54, 2, 0, 32, 1, 65, 4, 106, 32, 2, 65, 4, 108, 106, 32, 4, 167, 54, 2, 0, 32, 6, 15, 11, 32, 2, 11, 141, 1, 3, 3, 127, 2, 126, 1, 127, 65, 0, 33, 1, 32, 1, 40, 2, 0, 33, 2, 66, 0, 33, 4, 65, 0, 33, 3, 3, 64, 2, 64, 32, 3, 32, 2, 79, 13, 0, 32, 1, 65, 4, 106, 32, 3, 65, 4, 108, 106, 40, 2, 0, 173, 32, 0, 173, 126, 32, 4, 124, 33, 5, 32, 1, 65, 4, 106, 32, 3, 65, 4, 108, 106, 32, 5, 167, 54, 2, 0, 32, 5, 66, 32, 136, 33, 4, 32, 3, 65, 1, 106, 33, 3, 12, 1, 11, 11, 32, 4, 66, 0, 82, 4, 64, 32, 2, 65, 1, 106, 33, 6, 32, 1, 32, 6, 54, 2, 0, 32, 1, 65, 4, 106, 32, 2, 65, 4, 108, 106, 32, 4, 167, 54, 2, 0, 32, 6, 15, 11, 32, 2, 11, 16, 0, 65, 0, 65, 0, 54, 2, 0, 65, 4, 65, 0, 54, 2, 0, 11
        ])
    ), { env: { memory: wasmMemory } }).exports as BigInteger

const memory = new Uint8Array(swar.memory.buffer)
const limbs = new Uint32Array(memory.buffer)

export function parseNumberF64(b: Uint8Array, start: number): ReadResult<number> {
    let i = start

    const STATE_NEGATIVE = 0x01
    const STATE_DECIMAL = 0x02
    const STATE_END = 0x04
    const STATE_NONZERO = 0x08

    let state = 0 >>> 0

    if (b[i] === MINUS) {
        state ^= STATE_NEGATIVE
        i++
    }

    let scale = 0
    let digitsCount = 0

    const length = b.length


    memory.set(new Uint8Array(b.buffer, i))

    swar.get_digits(0, b.length - i)

    const positiveExponent = Math.max(0, scale)
    const integerDigitsPresent = Math.min(positiveExponent, digitsCount)
    const fractionalDigitsPresent = digitsCount - integerDigitsPresent

    const exponent = scale - integerDigitsPresent - fractionalDigitsPresent
    const fastExponent = Math.abs(exponent)

    return {
        type: ReadResultType.COMPLETE,
        value: {} as any,
        // value: numberToFloatingPointBitsSlow(
        //     instance, digitsCount, scale, positiveExponent,
        //     integerDigitsPresent, fractionalDigitsPresent, f64Format, true
        // ),
        nextIndex: i
    }
}

function numberToFloatingPointBitsSlow(
    mantissa: BigInteger,
    digitsCount: number,
    scale: number,
    positiveExponent: number,
    integerDigitsPresent: number,
    fractionalDigitsPresent: number,
    format: FloatFormat,
    hasNonZeroTail: boolean
): number {
    const { normalMantissaBits, overflowDecimalExponent } = format

    const requiredBitsOfPrecision = normalMantissaBits + 1

    const integerDigitsMissing = positiveExponent - integerDigitsPresent
    const integerLastIndex = integerDigitsPresent
    const fractionalFirstIndex = integerLastIndex
    const fractionalLastIndex = digitsCount

    let integerValue = mantissa
    // if (fractionalDigitsPresent > 0) {
    //     integerValue /= 10n ** BigInt(fractionalLastIndex - fractionalFirstIndex)
    // }

    // if (integerDigitsMissing > 0) {
    //     if (integerDigitsMissing > overflowDecimalExponent)
    //         return Infinity

    //     integerValue = integerValue * 10n ** BigInt(integerDigitsMissing)
    // }

    const integerBitsOfPrecision = bitLength1(limbs)

    if (integerBitsOfPrecision >= requiredBitsOfPrecision || fractionalDigitsPresent === 0) {
        return toNumber(
            integerValue,
            integerBitsOfPrecision,
            fractionalDigitsPresent !== 0,
            format
        )
    }

    return {} as any

    // let fractionalDenominatorExponent = fractionalDigitsPresent

    // if (scale < 0) {
    //     fractionalDenominatorExponent -= scale
    // }

    // if (integerBitsOfPrecision === 0 && (fractionalDenominatorExponent - digitsCount) > overflowDecimalExponent) {
    //     return 0
    // }

    // const divisor = 10n ** BigInt(fractionalLastIndex - fractionalFirstIndex)
    // let fractionalNumerator = mantissa % divisor

    // if (fractionalNumerator === 0n) {
    //     return toNumber(
    //         integerValue,
    //         integerBitsOfPrecision,
    //         fractionalDigitsPresent !== 0,
    //         format
    //     )
    // }

    // let fractionalDenominator = 10n ** BigInt(fractionalDenominatorExponent)

    // const fractionalNumeratorBits = bitLength(fractionalNumerator)
    // const fractionalDenominatorBits = bitLength(fractionalDenominator)

    // let fractionalShift = 0

    // if (fractionalDenominatorBits > fractionalNumeratorBits) {
    //     fractionalShift = fractionalDenominatorBits - fractionalNumeratorBits
    // }

    // if (fractionalShift > 0) {
    //     fractionalNumerator <<= BigInt(fractionalShift)
    // }

    // const requiredFractionalBitsOfPrecision = requiredBitsOfPrecision - integerBitsOfPrecision;
    // let remainingBitsOfPrecisionRequired = requiredFractionalBitsOfPrecision;

    // if (integerBitsOfPrecision > 0) {
    //     remainingBitsOfPrecisionRequired -= fractionalShift;
    // }

    // let fractionalExponent = fractionalShift

    // if (fractionalNumerator < fractionalDenominator) {
    //     fractionalExponent++
    // }

    // fractionalNumerator = fractionalNumerator << BigInt(remainingBitsOfPrecisionRequired)

    // let [fractionalMantissa, fractionalRemainder] = divRem(fractionalNumerator, fractionalDenominator)

    // const fractionalMantissaBits = countSignificantBits(fractionalMantissa)
    // let hasZeroTail = !hasNonZeroTail && fractionalRemainder === 0n

    // if (fractionalMantissaBits > requiredFractionalBitsOfPrecision) {
    //     const shift = (fractionalMantissaBits - requiredFractionalBitsOfPrecision)
    //     hasZeroTail = hasZeroTail && (fractionalMantissa & ((1n << BigInt(shift)) - 1n)) === 0n
    //     fractionalMantissa >>= BigInt(shift)
    // }

    // const completeMantissa = (integerValue << BigInt(requiredFractionalBitsOfPrecision)) + BigInt(fractionalMantissa)
    // const finalExponent = (integerBitsOfPrecision > 0) ? (integerBitsOfPrecision) - 2 : -(fractionalExponent) - 1

    // const test = bitLength(completeMantissa)
    // const test2 = assembleFloatingPointBits(
    //     completeMantissa,
    //     test,
    //     finalExponent,
    //     hasZeroTail,
    //     doublePrecisionFormat
    // )
    // return test2
}

const MASK64 = ((1n << 64n) - 1n)
const SHIFT_BIGINTS = new Array(1290)
const MASK_BIGINTS = new Array(1290)
for (let i = 1; i <= 1290; i++) {
    SHIFT_BIGINTS[i] = BigInt(i)
    MASK_BIGINTS[i] = (1n << BigInt(i)) - 1n
}

function toBigInt(limbs: Uint32Array) {
    let result = 0n;
    for (let i = limbs.length - 1; i >= 0; i--) {
        result <<= 32n;
        result |= BigInt(limbs[i]);
    }
    return result
}

function toNumber(
    value: BigInteger,
    bits: number,
    hasNonZeroFractionalPart: boolean,
    format: FloatFormat
): number {
    const denormalMantissaBits = format.denormalMantissaBits

    // if (bits <= 64)
    //     return assembleFloatingPointBits(value, bits, denormalMantissaBits, !hasNonZeroFractionalPart, doublePrecisionFormat)

    const shiftAmount = bits - 64
    // const shift = (SHIFT_BIGINTS[shiftAmount] ?? BigInt(shiftAmount))
    // const mantissa = value >> shift

    const exponent = denormalMantissaBits + shiftAmount

    // const mask = MASK_BIGINTS[shiftAmount] ?? ((1n << BigInt(shiftAmount)) - 1n)
    // const hasZeroTail = !hasNonZeroFractionalPart && ((value & mask) === 0n)

    const hasZeroTail = false

    const low32 = limbs[1] || 0
    const next32 = limbs[2] || 0

    mantissaU32[0] = low32
    mantissaU32[1] = next32

    const mantissa = getLow64BitsFrom32BitLimbs(limbs)

    // const mantissa = toBigInt(limbs)

    return assembleFloatingPointBits(
        mantissa,
        64,
        exponent,
        hasZeroTail,
        float64
    )
}

function getLow64BitsFrom32BitLimbs(limbs: Uint32Array) {
    const low32 = limbs[1] || 0
    const next32 = limbs[2] || 0

    return (BigInt(next32) << 32n) | BigInt(low32)
}

function assembleFloatingPointBits(
    initialMantissa: bigint,
    // initialMantissa: Uint32Array,
    initialMantissaBits: number,
    initialExponent: number,
    hasZeroTail: boolean,
    format: FloatFormat
): number {
    const normalMantissaShift = format.normalMantissaBits - initialMantissaBits
    const normalExponent = initialExponent - normalMantissaShift

    if (normalExponent > format.maxBinaryExponent)
        return Infinity

    let mantissa = initialMantissa
    let exponent = normalExponent

    if (normalExponent < format.minBinaryExponent) {
        const denormalMantissaShift = normalMantissaShift + normalExponent + format.exponentBias - 1

        exponent = -format.exponentBias

        if (denormalMantissaShift < 0) {
            mantissa = rightShiftWithRounding(mantissa, BigInt(-denormalMantissaShift), hasZeroTail);

            if (mantissa === 0n) {
                return format.zeroBits;
            }

            if (mantissa > format.denormalMantissaMask) {
                exponent = initialExponent - (denormalMantissaShift + 1) - normalMantissaShift;
            }
        }
        else {
            mantissa = mantissa << BigInt(denormalMantissaShift);
        }

        conversionU32[0] = 0
        conversionU32[1] = 0
        conversionU64[0] = mantissa
    }
    else {
        if (normalMantissaShift < 0) {
            mantissa = rightShiftWithRounding(mantissa, BigInt(-normalMantissaShift), hasZeroTail)

            if (mantissa > format.normalMantissaMask) {
                mantissa = mantissa >> 1n
                exponent++

                if (exponent > format.maxBinaryExponent)
                    return Infinity
            }
        }
        else if (normalMantissaShift > 0) {
            mantissa = mantissa << BigInt(normalMantissaShift)
        }
    }

    // const maskValue = 2 ** 52 - 1  // 9007199254740991
    // const combined = combineInt53(conversionU32[1], conversionU32[0])
    // const mantissa52bits = combined % (maskValue + 1)
    // const N = 4503599627370496 // 2^52
    // const expIdx = Math.min(Math.max(exponent, -1022), 1023) + 1022
    // return (1 + mantissa52bits / N) * POW2[expIdx]

    mantissa &= format.denormalMantissaMask

    const shiftedExponent = BigInt(exponent + format.exponentBias) << BigInt(format.denormalMantissaBits)
    const combined = shiftedExponent | mantissa
    conversionU64[0] = combined
    return conversionF64[0]

    // const array = new Float64Array([Number(combined)])
    // return array[0]

    // const maskValue = 2 ** 52 - 1  // 9007199254740991
    // const combined = combineInt53(conversionU32[1], conversionU32[0])
    // const mantissa52bits = combined % (maskValue + 1)

    // const N = 4503599627370496 // 2^52

    // if (exponent <= -1022) {
    //     return (mantissa52bits / N) * Math.pow(2, -1022)
    // }

    // const expIdx = Math.min(Math.max(exponent, -1022), 1023) + 1022
    // return (1 + mantissa52bits / N) * POW2[expIdx]

    // mantissa = mantissa & format.denormalMantissaMask

    // const shiftedExponent = BigInt((exponent + format.exponentBias)) << BigInt(format.denormalMantissaBits)
    // return Number(shiftedExponent | BigInt(mantissa))

    // const N = 4503599627370496 // 2^52

    // if (exponent <= -1022) {
    //     return (Number(mantissa) / N) * Math.pow(2, -1022)
    // }

    // const expIdx = Math.min(Math.max(exponent, -1022), 1023) + 1022
    // return (1 + Number(mantissa) / N) * POW2[expIdx]

    // mantissa = mantissa & format.denormalMantissaMask

    // const shiftedExponent = ((exponent + format.exponentBias)) << format.denormalMantissaBits
    // const test = BigInt(shiftedExponent) | mantissa
    // return Number(test)
}

function rightShiftWithRounding(
    value: bigint,
    shift: bigint,
    hasZeroTail: boolean
): bigint {
    if (shift === 0n) return value

    let result = value >> shift

    const extraBitsMask = (1n << (shift - 1n)) - 1n
    const roundBitMask = (1n << (shift - 1n))
    const lsbBitMask = 1n << shift

    const lsbBit = (value & lsbBitMask) != 0n
    const roundBit = (value & roundBitMask) != 0n
    const hasTailBits = !hasZeroTail || (value & extraBitsMask) != 0n

    if (roundBit && (hasTailBits || lsbBit)) {
        return result + 1n
    }

    // const lastBitMask = 1n << BigInt(shift - 1)
    // const lastBit = (value & lastBitMask) !== 0n

    // const lowerBitsMask = lastBitMask - 1n
    // const hasLowerBits = (value & lowerBitsMask) !== 0n

    // if (lastBit && (hasLowerBits || hasZeroTail || (result & 1n)))
    //     return result + 1n

    return result
}

export function bitLength1(limbs: Uint32Array): number {
    const limbsCount = limbs[0] - 1
    return limbsCount * 32 + (32 - Math.clz32(limbs[limbsCount + 1]))
}

export function bitLength(value: bigint): number {
    if (value === 0n) return 0

    const MASK64 = 0xFFFFFFFFFFFFFFFFn
    const MASK32 = 0xFFFFFFFFn

    if (value <= MASK64) {
        const high = Number(value >> 32n)
        const low = Number(value & MASK32)

        if (high > 0)
            return 32 + (32 - Math.clz32(high))
        return 32 - Math.clz32(low)
    }

    let bits = 0
    let temp = value

    while (temp > MASK64) {
        temp >>= 64n
        bits += 64
    }

    while (temp > MASK32) {
        temp >>= 32n
        bits += 32
    }

    const last = Number(temp)
    if (last <= 0xFFFFFFFF)
        return bits + (32 - Math.clz32(last))

    const high = Math.floor(last / 0x100000000)
    const low = last % 0x100000000

    if (high > 0)
        return bits + 32 + (32 - Math.clz32(high))
    return bits + (32 - Math.clz32(low))
}
