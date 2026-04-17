import { JsonCodes } from "../utils/constants"
import { ConvertMeta, ConvertResult, ConvertState } from "./types"

export function convertNumber(
    ctx: ConvertState, _metadata: ConvertMeta, index: number, _depth: number): ConvertResult<number> {
    const bytes = ctx.bytes

    let digitsCount = 0
    let j = index
    while (bytes[j] !== JsonCodes.CURLY_CLOSE && bytes[j] !== JsonCodes.COMMA) {
        digitsCount += isDigit(bytes[j]) ? 1 : 0
        j++
    }

    const number = parseNumberF64(bytes, index, j, digitsCount)

    return {
        value: number,
        nextIndex: j
    }
}

const isDigit = (byte: number) => byte >= 48 && byte <= 57

const decoder = new TextDecoder('utf-8', { fatal: true })
const POS_POW10 = [1]
const POW10 = [1n]
for (let i = 1; i <= 308; i++) {
    POS_POW10[i] = POS_POW10[i - 1] * 10
    POW10[i] = POW10[i - 1] * 10n
}

// const buffer = new ArrayBuffer(8)
// const uint32 = new Uint32Array(buffer)
// const uint64 = new BigUint64Array(buffer)

const MAX_FAST_PATH_DIGITS = 16
export function parseNumberF64(bytes: Uint8Array, start: number, end: number, digitsCount: number): number {
    if (digitsCount < MAX_FAST_PATH_DIGITS) {
        let i = start

        const PLUS = 43
        const MINUS = 45

        const STATE_NEGATIVE = 0x01  // bit 0
        const STATE_NONZERO = 0x02  // bit 1
        const STATE_DECIMAL = 0x04  // bit 2

        let state = 0

        if (bytes[i] === MINUS) {
            state ^= STATE_NEGATIVE
            i++
        }
        else if (bytes[i] === PLUS) {
            i++
        }

        const ZERO = 48
        const DOT = 46
        const EXPONENT = 69
        const EXPONENT_UPPER = 101

        let mantissa = 0
        let scale = 0
        let numberOfTrailingZeros = 0

        while (i + 3 < end) {
            const b1 = bytes[i]
            const b2 = bytes[i + 1]
            const b3 = bytes[i + 2]
            const b4 = bytes[i + 3]

            if (isDigit(b1) && isDigit(b2) && isDigit(b3) && isDigit(b4)) {
                mantissa = mantissa * 10000 +
                    ((((b1 & 0x0F) * 10 + (b2 & 0x0F)) * 10 + (b3 & 0x0F)) * 10 + (b4 & 0x0F))

                scale += 4
                i += 4
                continue
            }
            break
        }

        while (i < end) {
            const byte = bytes[i]

            if (isDigit(byte)) {
                if (byte !== ZERO || (state & STATE_NONZERO)) {
                    mantissa = mantissa * 10 + (byte & 0x0F)

                    numberOfTrailingZeros = byte === ZERO ? numberOfTrailingZeros + 1 : 0

                    if ((state & STATE_DECIMAL) === 0) {
                        scale++
                    }

                    state |= STATE_NONZERO
                }
                else if (state & STATE_DECIMAL) {
                    scale--
                }
            }
            else if (byte === DOT) {
                state |= STATE_DECIMAL
            }
            else if (byte === EXPONENT || byte === EXPONENT_UPPER) {
                i++

                let signExp = 1
                if (bytes[i] === MINUS) {
                    signExp = -1
                    i++
                }
                else if (bytes[i] === PLUS) {
                    i++
                }

                let exponent = 0
                while (isDigit(bytes[i])) {
                    exponent = exponent * 10 + (bytes[i] & 0x0F)
                    i++
                }

                exponent *= signExp
                scale += exponent
                break
            }
            i++
        }

        const positiveExponent = Math.max(0, scale)
        const integerDigitsPresent = Math.min(positiveExponent, digitsCount)
        const fractionalDigitsPresent = digitsCount - integerDigitsPresent

        const exponent = scale - integerDigitsPresent - fractionalDigitsPresent
        const fastExponent = Math.abs(exponent)

        const MAX_SAFE_EXPONENT = 308

        if (fastExponent <= MAX_SAFE_EXPONENT) {
            const expScale = POS_POW10[fastExponent]

            if (fractionalDigitsPresent !== 0) {
                mantissa /= expScale
            }
            else {
                mantissa *= expScale
            }

            if (state & STATE_NEGATIVE)
                return -mantissa

            return mantissa
        }
    }

    return Number(decoder.decode(bytes.subarray(start, end)))

    // let i = start

    // const PLUS = 43
    // const MINUS = 45

    // const STATE_NEGATIVE = 0x01  // bit 0
    // const STATE_NONZERO = 0x02  // bit 1
    // const STATE_DECIMAL = 0x04  // bit 2


    // let state = 0

    // if (bytes[i] === MINUS) {
    //     state ^= STATE_NEGATIVE
    //     i++
    // }
    // else if (bytes[i] === PLUS) {
    //     i++
    // }

    // const ZERO = 48
    // const DOT = 46
    // const EXPONENT = 69
    // const EXPONENT_UPPER = 101

    // let mantissa = 0n
    // let scale = 0
    // let numberOfTrailingZeros = 0

    // let tempNum = 0
    // let tempDigits = 0
    // while (i + 4 < end) {
    //     const b1 = bytes[i]
    //     const b2 = bytes[i + 1]
    //     const b3 = bytes[i + 2]
    //     const b4 = bytes[i + 3]
    //     const b5 = bytes[i + 4]

    //     if (isDigit(b1) && isDigit(b2) && isDigit(b3) && isDigit(b4) && isDigit(b5)) {
    //         tempNum = tempNum * 100000 +
    //             (((((b1 & 0x0F) * 10 + (b2 & 0x0F)) * 10 + (b3 & 0x0F)) * 10 + (b4 & 0x0F)) * 10 + (b5 & 0x0F))
    //         tempDigits += 5

    //         if (tempDigits >= 15) {
    //             const high = Math.floor(tempNum / 0x100000000)
    //             const low = tempNum >>> 0
    //             uint32[0] = low
    //             uint32[1] = high
    //             mantissa = mantissa * POW10[tempDigits] + uint64[0]

    //             tempDigits = 0
    //             tempNum = 0
    //         }

    //         scale += 5
    //         i += 5
    //         continue
    //     }

    //     break
    // }

    // while (i < end) {
    //     const byte = bytes[i]

    //     if (isDigit(byte)) {
    //         if (byte !== ZERO || (state & STATE_NONZERO)) {
    //             const digit = byte & 0x0F

    //             tempNum = tempNum * 10 + digit
    //             tempDigits++

    //             if (tempDigits >= 15) {
    //                 const high = Math.floor(tempNum / 0x100000000)
    //                 const low = tempNum >>> 0
    //                 uint32[0] = low
    //                 uint32[1] = high
    //                 mantissa = mantissa * POW10[tempDigits] + uint64[0]

    //                 tempDigits = 0
    //                 tempNum = 0
    //             }

    //             numberOfTrailingZeros += byte === ZERO ? 1 : 0

    //             if ((state & STATE_DECIMAL) === 0) {
    //                 scale++
    //             }

    //             state |= STATE_NONZERO
    //             digitsCount++
    //         }
    //         else if (state & STATE_DECIMAL) {
    //             scale--
    //         }
    //     }
    //     else if (byte === DOT) {
    //         state |= STATE_DECIMAL
    //     }
    //     else if (byte === EXPONENT || byte === EXPONENT_UPPER) {
    //         i++

    //         let signExp = 1
    //         if (bytes[i] === MINUS) {
    //             signExp = -1
    //             i++
    //         }
    //         else if (bytes[i] === PLUS) {
    //             i++
    //         }

    //         let exponent = 0
    //         while (isDigit(bytes[i])) {
    //             exponent = exponent * 10 + (bytes[i] - 48)
    //             i++
    //         }

    //         exponent *= signExp
    //         scale += exponent
    //         break
    //     }

    //     i++
    // }

    // if (tempDigits > 0) {
    //     const high = Math.floor(tempNum / 0x100000000)
    //     const low = tempNum >>> 0
    //     uint32[0] = low
    //     uint32[1] = high
    //     mantissa = mantissa * POW10[tempDigits] + uint64[0]
    // }

    // const positiveExponent = Math.max(0, scale)
    // const integerDigitsPresent = Math.min(positiveExponent, digitsCount)
    // const fractionalDigitsPresent = digitsCount - integerDigitsPresent

    // return numberToFloatingPointBitsSlow(
    //     mantissa, digitsCount, scale, positiveExponent,
    //     integerDigitsPresent, fractionalDigitsPresent, doublePrecisionFormat
    // )
}

function numberToFloatingPointBitsSlow(
    mantissa: bigint,
    digitsCount: number,
    scale: number,
    positiveExponent: number,
    integerDigitsPresent: number,
    fractionalDigitsPresent: number,
    format: FloatFormatInfo
): number {
    const { normalMantissaBits, denormalMantissaBits, overflowDecimalExponent } = format

    const requiredBitsOfPrecision = normalMantissaBits + 1

    const integerDigitsMissing = positiveExponent - integerDigitsPresent

    const integerLastIndex = integerDigitsPresent
    const fractionalFirstIndex = integerLastIndex
    const fractionalLastIndex = digitsCount

    let integerValue = mantissa
    if (fractionalDigitsPresent > 0) {
        integerValue /= 10n ** BigInt(fractionalLastIndex - fractionalFirstIndex)
    }

    if (integerDigitsMissing > 0) {
        if (integerDigitsMissing > overflowDecimalExponent)
            return Infinity

        integerValue = integerValue * 10n ** BigInt(integerDigitsMissing)
    }

    const integerBitsOfPrecision = bitLength(integerValue)

    if ((integerBitsOfPrecision >= requiredBitsOfPrecision) || (fractionalDigitsPresent === 0)) {
        return convertBigIntegerToFloatingPointBits(
            integerValue,
            integerBitsOfPrecision,
            fractionalDigitsPresent !== 0,
            denormalMantissaBits
        )
    }

    let fractionalDenominatorExponent = fractionalDigitsPresent

    if (scale < 0) {
        fractionalDenominatorExponent -= scale
    }

    if (integerBitsOfPrecision === 0 && (fractionalDenominatorExponent - digitsCount) > overflowDecimalExponent) {
        return 0
    }

    const divisor = 10n ** BigInt(fractionalLastIndex - fractionalFirstIndex)
    let fractionalNumerator = mantissa % divisor

    if (fractionalNumerator === 0n) {
        return convertBigIntegerToFloatingPointBits(
            integerValue,
            integerBitsOfPrecision,
            fractionalDigitsPresent !== 0,
            denormalMantissaBits
        )
    }

    let fractionalDenominator = 10n ** BigInt(fractionalDenominatorExponent)

    const fractionalNumeratorBits = bitLength(fractionalNumerator)
    const fractionalDenominatorBits = bitLength(fractionalDenominator)

    let fractionalShift = 0

    if (fractionalDenominatorBits > fractionalNumeratorBits) {
        fractionalShift = fractionalDenominatorBits - fractionalNumeratorBits
    }

    if (fractionalShift > 0) {
        fractionalNumerator <<= BigInt(fractionalShift)
    }

    const requiredFractionalBitsOfPrecision = requiredBitsOfPrecision - integerBitsOfPrecision;
    let remainingBitsOfPrecisionRequired = requiredFractionalBitsOfPrecision;

    if (integerBitsOfPrecision > 0) {


        remainingBitsOfPrecisionRequired -= fractionalShift;
    }

    let fractionalExponent = fractionalShift

    if (fractionalNumerator < fractionalDenominator) {
        fractionalExponent++
    }

    fractionalNumerator = fractionalNumerator << BigInt(remainingBitsOfPrecisionRequired)

    let [fractionalMantissa, fractionalRemainder] = divRem(fractionalNumerator, fractionalDenominator)

    const fractionalMantissaBits = countSignificantBits1(fractionalMantissa)

    if (fractionalMantissaBits > requiredFractionalBitsOfPrecision) {
        const shift = (fractionalMantissaBits - requiredFractionalBitsOfPrecision)
        fractionalMantissa >>= shift
    }

    const completeMantissa = (integerValue << BigInt(requiredFractionalBitsOfPrecision)) + BigInt(fractionalMantissa)
    const finalExponent = (integerBitsOfPrecision > 0) ? (integerBitsOfPrecision) - 2 : -(fractionalExponent) - 1

    return assembleFloatingPointBits(
        completeMantissa,
        bitLength(completeMantissa),
        finalExponent,
        false,
        doublePrecisionFormat
    )
}

function divRem(dividend: any, divisor: any) {
    if (divisor === 0n) {
        throw new RangeError("Division by zero");
    }

    const quotient = dividend / divisor;
    const remainder = dividend % divisor;

    return [quotient, remainder];
}

function convertBigIntegerToFloatingPointBits(
    value: bigint,
    integerBitsOfPrecision: number,
    hasNonZeroFractionalPart: boolean,
    denormalMantissaBits: number,
): number {
    const baseExponent = denormalMantissaBits

    if (integerBitsOfPrecision <= 64) {
        const initialMantissa = value & ((1n << 64n) - 1n)
        return assembleFloatingPointBits(
            initialMantissa,
            bitLength(initialMantissa),
            baseExponent,
            !hasNonZeroFractionalPart,
            doublePrecisionFormat
        )
    }

    const shiftAmount = integerBitsOfPrecision - 64
    let mantissa = (value >> BigInt(shiftAmount))
    if (shiftAmount < 0)
        mantissa &= ((1n << 64n) - 1n)
    const exponent = baseExponent + shiftAmount

    const lowerBitsMask = (1n << BigInt(shiftAmount)) - 1n
    const hasZeroTail = !hasNonZeroFractionalPart && ((value & lowerBitsMask) === 0n)

    return assembleFloatingPointBits(
        mantissa,
        64,
        exponent,
        hasZeroTail,
        doublePrecisionFormat
    )
}

function assembleFloatingPointBits(
    initialMantissa: bigint,
    initialMantissaBits: number,
    initialExponent: number,
    hasZeroTail: boolean,
    format: FloatFormatInfo
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
            mantissa = rightShiftWithRounding(mantissa, -denormalMantissaShift, hasZeroTail);

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
    }
    else {
        if (normalMantissaShift < 0) {
            mantissa = rightShiftWithRounding(mantissa, -normalMantissaShift, hasZeroTail);

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

    mantissa = mantissa & format.denormalMantissaMask

    const N = 4503599627370496 // 2^52
    return (1 + Number(mantissa) / N) * (2 ** exponent)
}

function countSignificantBits1(value: number): number {
    if (value === 0) return 0
    return value.toString(2).length
}

function rightShiftWithRounding(
    value: bigint,
    shift: number,
    hasZeroTail: boolean
): bigint {
    if (shift === 0) return value

    let result = value >> BigInt(shift)

    const lastBitMask = 1n << BigInt(shift - 1)
    const lastBit = (value & lastBitMask) !== 0n

    const lowerBitsMask = lastBitMask - 1n
    const hasLowerBits = (value & lowerBitsMask) !== 0n

    if (lastBit && (hasLowerBits || hasZeroTail || (result & 1n)))
        return result + 1n

    return result
}

function bitLengthBinary(n: bigint) {
    let high = 64
    while ((1n << BigInt(high)) <= n) high *= 2

    let low = high / 2;
    while (low < high) {
        const mid = (low + high) >> 1
        if ((1n << BigInt(mid)) <= n) {
            low = mid + 1
            continue
        }
        high = mid
    }
    return low
}

function bitLengthDigits(n: bigint, digits: number) {
    const LOG2_10 = 1 / Math.LOG10E //3.321928094887362
    let bits = Math.floor(digits * LOG2_10)

    const temp = 1n << BigInt(bits)
    if (temp <= n) {
        while ((1n << BigInt(bits)) <= n) bits++
        return bits
    }

    while ((1n << BigInt(bits - 1)) > n) bits--
    return bits
}

function bitLength(value: bigint): number {
    const MASK64 = 0xFFFFFFFFFFFFFFFFn
    if (value <= MASK64)
        return 64 - Math.clz32(Number(value >> 32n)) - (value > 0xFFFFFFFFn ? 0 : 32)

    let bits = 0
    let temp = value

    while (temp > MASK64) {
        temp >>= 64n
        bits += 64
    }

    const last = Number(temp)
    if (last <= 0xFFFFFFFF) {
        return bits + (32 - Math.clz32(last))
    }
    return bits + (64 - Math.clz32(last >>> 0))
}

interface FloatFormatInfo {
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

const doublePrecisionFormat: FloatFormatInfo = {
    normalMantissaBits: 53,      // 52 stored + 1 hidden
    denormalMantissaBits: 52,
    exponentBias: 1023,
    maxBinaryExponent: 1023,
    minBinaryExponent: -1022,
    exponentBits: 11,
    normalMantissaMask: (1n << 53n) - 1n,
    denormalMantissaMask: (1n << 52n) - 1n,
    zeroBits: 0,
    overflowDecimalExponent: 308
}
