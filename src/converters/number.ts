import { ConvertMeta, ConvertResult, ConvertState } from "./types"

export function convertNumber(
    ctx: ConvertState, _metadata: ConvertMeta, index: number, _depth: number): ConvertResult<number> {
    const bytes = ctx.bytes

    return parseNumberF64(bytes, index)
}

const isDigit = (byte: number) => byte >= 48 && byte <= 57

const POS_POW10 = [1]
const POW10 = [1n]
for (let i = 1; i <= 308; i++) {
    POS_POW10[i] = POS_POW10[i - 1] * 10
    POW10[i] = POW10[i - 1] * 10n
}
const POW2 = new Array(2046) // indices from -1022 to 1023
for (let exp = -1022; exp <= 1023; exp++) {
    POW2[exp + 1022] = Math.pow(2, exp)
}

const MAX_DIGITS_COUNT = 512

const buffer = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(buffer)
const conversionU64 = new BigUint64Array(buffer)

const isLittleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1

export function parseNumberF64(bytes: Uint8Array, start: number): ConvertResult<number> {
    let i = start

    const STATE_NEGATIVE = 0x01
    const STATE_DECIMAL = 0x02
    const STATE_END = 0x04
    const STATE_BIG = 0x08

    let state = 0 >>> 0

    const PLUS = 43
    const MINUS = 45
    if (bytes[i] === MINUS) {
        state ^= STATE_NEGATIVE
        i++
    }

    const DOT = 46
    const EXPONENT = 69
    const EXPONENT_UPPER = 101

    let scale = 0

    let mantissa = 0n
    let digitsCount = 0
    let tempMantissa = 0
    let tempDigitsCount = 0
    let hasNonZeroTail = false
    let numberOfTrailingZeros = 0

    const end = bytes.length
    while (i < end) {
        if (i < end - 4) {
            const a = bytes[i]
            const b = bytes[i + 1]
            const c = bytes[i + 2]
            const d = bytes[i + 3]

            const word = (a << 0 | b << 8 | c << 16 | d << 24) - 0x30303030
            const temp = ((word + 0x76767676) | word) & 0x80808080

            if (temp === 0) {
                let chunk = 0

                if (isLittleEndian) {
                    const result =
                        ((word & 0x00FF00FF) * 10) +
                        ((word >> 8) & 0x00FF00FF)
                    chunk = ((result & 0xFFFF) * 100) + (result >>> 16)
                }
                else {
                    const high =
                        ((word >> 24) & 0xFF) * 10 +
                        ((word >> 16) & 0xFF)
                    const low =
                        ((word >> 8) & 0xFF) * 10 +
                        ((word & 0xFF))
                    chunk = high * 100 + low
                }

                tempDigitsCount += 4

                numberOfTrailingZeros = (chunk === 0 ? (numberOfTrailingZeros + 4) : 0)

                const dump = [d, c, b, a]
                let j = 0
                while (j < dump.length && dump[j] === 0) {
                    numberOfTrailingZeros++
                    j += 1
                }

                //TODO: if digits count more than max then set hasNonZeroTail 

                if (tempDigitsCount >= 17) {
                    conversionU32[0] = tempMantissa >>> 0
                    conversionU32[1] = Math.floor(tempMantissa / 0x100000000)

                    state |= STATE_BIG
                    mantissa = mantissa * POW10[tempDigitsCount - 4] + conversionU64[0]

                    tempDigitsCount = 4
                    tempMantissa = chunk
                }
                else if (tempDigitsCount >= 16) {
                    const high = Math.floor(tempMantissa / 0x100000000)
                    const low = tempMantissa >>> 0
                    const newLow = low * 10000 + chunk
                    const carry = Math.floor(newLow / 0x100000000)
                    conversionU32[0] = newLow >>> 0
                    conversionU32[1] = high * 10000 + carry

                    state |= STATE_BIG
                    mantissa = mantissa * POW10[tempDigitsCount] + conversionU64[0]
                    tempDigitsCount = 0
                    tempMantissa = 0
                }
                else {
                    tempMantissa = tempMantissa * 10000 + chunk
                }

                if ((state & STATE_DECIMAL) === 0)
                    scale += 4

                digitsCount += 4
                i += 4
                continue
            }
        }

        const sub_end = Math.min(end, i + 4)
        while (i < sub_end) {
            const byte = bytes[i]

            if (isDigit(byte)) {
                const digit = byte & 0x0F

                tempDigitsCount++
                digitsCount++
                i++

                if ((state & STATE_DECIMAL) === 0)
                    scale++

                numberOfTrailingZeros = (digit === 0 ? numberOfTrailingZeros + 1 : 0)

                if (tempDigitsCount === 17) {
                    conversionU32[0] = tempMantissa >>> 0
                    conversionU32[1] = Math.floor(tempMantissa / 0x100000000)

                    state |= STATE_BIG
                    mantissa = mantissa * POW10[tempDigitsCount - 1] + conversionU64[0]

                    tempDigitsCount = 1
                    tempMantissa = digit
                }
                else if (tempDigitsCount === 16) {
                    const high = Math.floor(tempMantissa / 0x100000000)
                    const low = tempMantissa >>> 0
                    const newLow = low * 10 + digit
                    const carry = Math.floor(newLow / 0x100000000)
                    conversionU32[0] = newLow >>> 0
                    conversionU32[1] = high * 10 + carry

                    state |= STATE_BIG
                    mantissa = mantissa * POW10[tempDigitsCount] + conversionU64[0]

                    tempDigitsCount = 0
                    tempMantissa = 0
                }
                else {
                    tempMantissa = tempMantissa * 10 + digit
                }

                continue
            }
            else if (byte === DOT) {
                state |= STATE_DECIMAL
                i++
                continue
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
                    exponent = exponent * 10 + (bytes[i] - 48)
                    i++
                }

                exponent *= signExp
                scale += exponent

                state |= STATE_END
                break
            }

            state |= STATE_END
            break
        }

        if (state & STATE_END)
            break
    }

    if ((state & STATE_BIG) && tempDigitsCount > 0) {
        const high = Math.floor(tempMantissa / 0x100000000)
        const low = tempMantissa >>> 0
        conversionU32[0] = low
        conversionU32[1] = high
        mantissa = mantissa * POW10[tempDigitsCount] + conversionU64[0]
    }

    const numberOfFractionalDigits = digitsCount - scale
    if (numberOfFractionalDigits > 0) {
        numberOfTrailingZeros = Math.min(numberOfTrailingZeros, numberOfFractionalDigits)
        digitsCount -= numberOfTrailingZeros

        if (mantissa > 0) {
            mantissa /= 10n ** BigInt(digitsCount - (digitsCount - numberOfTrailingZeros))
        }
        else {
            tempMantissa /= 10 ** (digitsCount - (digitsCount - numberOfTrailingZeros))
        }
    }

    const minDecimalExponent = -324
    if ((digitsCount >= 0 && tempMantissa === 0 && mantissa === 0n) || scale < minDecimalExponent) {
        return {
            value: (state & STATE_NEGATIVE) ? -0 : 0,
            nextIndex: i
        }
    }

    const positiveExponent = Math.max(0, scale)
    const integerDigitsPresent = Math.min(positiveExponent, digitsCount)
    const fractionalDigitsPresent = digitsCount - integerDigitsPresent

    const exponent = scale - integerDigitsPresent - fractionalDigitsPresent
    const fastExponent = Math.abs(exponent)

    const MAX_SAFE_EXPONENT = 22
    if ((state & STATE_BIG) === 0 && fastExponent >= MAX_SAFE_EXPONENT) {
        state |= STATE_BIG
        mantissa = BigInt(tempMantissa)
    }

    if (state & STATE_BIG) {
        if (digitsCount <= 19) {
            const float = computeFloat(exponent, mantissa, defaultFloatInfo)!
            if (float) {
                return {
                    value: float,
                    nextIndex: i
                }
            }
        }

        const result = numberToFloatingPointBitsSlow(
            mantissa, digitsCount, scale, positiveExponent,
            integerDigitsPresent, fractionalDigitsPresent, doublePrecisionFormat, hasNonZeroTail
        )
        return {
            value: (state & STATE_NEGATIVE) ? -result : result,
            nextIndex: i
        }
    }

    const expScale = POS_POW10[fastExponent]

    if (fractionalDigitsPresent !== 0)
        tempMantissa /= expScale
    else
        tempMantissa *= expScale

    if (state & STATE_NEGATIVE)
        return {
            value: -tempMantissa,
            nextIndex: i
        }

    return {
        value: tempMantissa,
        nextIndex: i
    }
}

export function computeFloat(e: number, m: bigint, info: IFloatInfo): number | undefined {
    if (m === 0n || e < info.minSafeExponent)
        return undefined

    if (e > info.maxSafeExponent)
        return NaN

    const lz = clz(m)

    const normalizedM = m << BigInt(lz)

    const product = computeProductApproximation(info.denormalMantissaBits + 3, e, normalizedM)

    const insideSafeExponent = e >= -27 && e <= 55
    if (product.low === 0xFFFFFFFFFFFFFFFFn && !insideSafeExponent) {
        return undefined
    }

    const upperBit = Number(product.high >> 63n)

    let mantissa = product.high >> BigInt(upperBit + 64 - info.denormalMantissaBits - 3)
    let exponent = (calculatePower(e) + upperBit - lz - (-info.maxBinaryExponent));

    if (exponent <= 0) {
        if (-exponent + 1 >= 64) {
            return undefined
        }

        mantissa >>= BigInt(-exponent + 1)
        mantissa += (mantissa & 1n)
        mantissa >>= 1n

        exponent = mantissa < (1n << BigInt(info.denormalMantissaBits)) ? 0 : 1
    }
    else {
        if (product.low <= 1n && e >= info.minExponentRoundToEven && e <= info.maxExponentRoundToEven &&
            (mantissa & 3n) === 1n) {

            const check = mantissa << BigInt(upperBit + 64 - info.denormalMantissaBits - 3)
            if (check === product.high) {
                mantissa &= ~1n
            }
        }

        mantissa += (mantissa & 1n)
        mantissa >>= 1n

        if (mantissa >= (2n << BigInt(info.denormalMantissaBits))) {
            mantissa = (1n << BigInt(info.denormalMantissaBits))
            exponent++
        }

        mantissa &= ~(1n << BigInt(info.denormalMantissaBits))

        if (exponent >= info.infinityExponent) {
            return Infinity
        }
    }

    if (exponent > 0) {
        const mantissaNum = Number(mantissa & info.denormalMantissaMask)

        if (exponent === info.infinityExponent && mantissaNum === 0) {
            return Infinity
        }

        if (exponent === info.infinityExponent && mantissaNum !== 0) {
            return NaN
        }

        const normalizedExponent = exponent - info.maxBinaryExponent
        const normalizedMantissa = 1 + mantissaNum / Math.pow(2, info.denormalMantissaBits)
        return normalizedMantissa * Math.pow(2, normalizedExponent)
    }

    return undefined
}

function computeProductApproximation(bitPrecision: number, e: number, m: bigint): { high: bigint; low: bigint } {
    const index = 2 * (e + 342)

    const product = m * POW5_128[index]
    let low = product & 0xFFFFFFFFFFFFFFFFn
    let high = product >> 64n

    const precisionMask = bitPrecision < 64
        ? (0xFFFFFFFFFFFFFFFFn >> BigInt(bitPrecision))
        : 0xFFFFFFFFFFFFFFFFn

    if ((high & precisionMask) === precisionMask) {
        const high2 = (m * POW5_128[index + 1]) >> 64n
        low += high2

        low = BigInt.asUintN(64, low)

        return {
            high: high + (high2 > low ? 1n : 0n),
            low: low
        }
    }

    return { high, low }
}

function clz(x: bigint): number {
    if (x === 0n) return 64
    const bitLength = x.toString(2).length
    return 64 - bitLength

    // Clamp to 64-bit unsigned range
    // x = BigInt.asUintN(64, x)
    // if (x === 0n) return 64

    // const high = Number(x >> 32n) // high 32 bits as Number
    // if (high !== 0) {
    //     return Math.clz32(high) // leading zeros in high 32 bits
    // }
    // const low = Number(x & 0xFFFFFFFFn) // low 32 bits as Number
    // return 32 + Math.clz32(low) // all high bits were zero
}

function calculatePower(q: number): number {
    return (((152170 + 65536) * q) >> 16) + 63
}

interface IFloatInfo {
    denormalMantissaBits: number
    denormalMantissaMask: bigint
    minSafeExponent: number
    maxSafeExponent: number
    maxBinaryExponent: number
    infinityExponent: number
    minExponentRoundToEven: number
    maxExponentRoundToEven: number
}

const defaultFloatInfo: IFloatInfo = {
    denormalMantissaBits: 52,
    denormalMantissaMask: (1n << 52n) - 1n,
    minSafeExponent: -342,
    maxSafeExponent: 308,
    maxBinaryExponent: 1023,
    infinityExponent: 2047,
    minExponentRoundToEven: -27,
    maxExponentRoundToEven: 55
}

function numberToFloatingPointBitsSlow(
    mantissa: bigint,
    digitsCount: number,
    scale: number,
    positiveExponent: number,
    integerDigitsPresent: number,
    fractionalDigitsPresent: number,
    format: FloatFormatInfo,
    hasNonZeroTail: boolean
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

    const fractionalMantissaBits = countSignificantBits(fractionalMantissa)
    let hasZeroTail = !hasNonZeroTail && fractionalRemainder === 0n

    if (fractionalMantissaBits > requiredFractionalBitsOfPrecision) {
        const shift = (fractionalMantissaBits - requiredFractionalBitsOfPrecision)
        hasZeroTail = hasZeroTail && (fractionalMantissa & ((1n << BigInt(shift)) - 1n)) === 0n
        fractionalMantissa >>= BigInt(shift)
    }

    const completeMantissa = (integerValue << BigInt(requiredFractionalBitsOfPrecision)) + BigInt(fractionalMantissa)
    const finalExponent = (integerBitsOfPrecision > 0) ? (integerBitsOfPrecision) - 2 : -(fractionalExponent) - 1

    const test = bitLength(completeMantissa)
    const test2 = assembleFloatingPointBits(
        completeMantissa,
        test,
        finalExponent,
        hasZeroTail,
        doublePrecisionFormat
    )
    return test2
}

function divRem(dividend: bigint, divisor: bigint) {
    if (divisor === 0n) {
        throw new RangeError("Division by zero");
    }

    const quotient = dividend / divisor;
    const remainder = dividend % divisor;

    return [quotient, remainder];
}

const MASK64 = ((1n << 64n) - 1n)
const SHIFT_BIGINTS = new Array(1290)
const MASK_BIGINTS = new Array(1290)
for (let i = 1; i <= 1290; i++) {
    SHIFT_BIGINTS[i] = BigInt(i)
    MASK_BIGINTS[i] = (1n << BigInt(i)) - 1n
}

function convertBigIntegerToFloatingPointBits(
    value: bigint,
    integerBitsOfPrecision: number,
    hasNonZeroFractionalPart: boolean,
    denormalMantissaBits: number,
): number {
    const baseExponent = denormalMantissaBits

    if (integerBitsOfPrecision <= 64) {
        return assembleFloatingPointBits(
            value,
            bitLength(value),
            baseExponent,
            !hasNonZeroFractionalPart,
            doublePrecisionFormat
        )
    }

    const shiftAmount = integerBitsOfPrecision - 64

    let mantissa = value >> BigInt(shiftAmount)
    // if (shiftAmount >= 0) {
    //     mantissa = value >> SHIFT_BIGINTS[shiftAmount]
    // }
    // else {
    //     mantissa = (value << SHIFT_BIGINTS[shiftAmount + 127]) & MASK64
    // }
    const exponent = baseExponent + shiftAmount

    const hasZeroTail = !hasNonZeroFractionalPart && ((value & ((1n << BigInt(shiftAmount)) - 1n)) === 0n)

    // const shiftAmount = integerBitsOfPrecision - 64

    // let mantissa
    // if (shiftAmount >= 0) {
    //     mantissa = value >> BigInt(shiftAmount)
    // }
    // else {
    //     mantissa = (value << BigInt((-shiftAmount))) & ((1n << 64n) - 1n)
    // }
    // const exponent = baseExponent + shiftAmount

    // const lowerBitsMask = (1n << BigInt(shiftAmount)) - 1n
    // const hasZeroTail = !hasNonZeroFractionalPart && ((value & lowerBitsMask) === 0n)

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

        conversionU32[0] = 0
        conversionU32[1] = 0
        conversionU64[0] = mantissa
    }
    else {
        if (normalMantissaShift < 0) {
            mantissa = rightShiftWithRounding(mantissa, -normalMantissaShift, hasZeroTail)

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
    return new Float64Array(new BigUint64Array([combined]).buffer)[0]

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

function combineInt53(high21: number, low32: number) {
    high21 = Number(high21) & 0x1FFFFF
    low32 = Number(low32) >>> 0
    return (high21 * 0x100000000) + low32
}

function countSignificantBits(value: bigint): number {
    if (value === 0n) return 0
    return value.toString(2).length
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

    const extraBitsMask = (1n << (BigInt(shift) - 1n)) - 1n
    const roundBitMask = (1n << (BigInt(shift) - 1n))
    const lsbBitMask = 1n << BigInt(shift)

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

function rightShiftWithRounding64(
    value: bigint,
    conversionU32: Uint32Array,
    conversionU64: BigUint64Array,
    shift: number,
    hasZeroTail: boolean
): bigint {
    if (shift === 0) return 0n
    if (shift >= 64) {
        return 0n
    }

    conversionU64[0] = value

    const low = conversionU32[0]
    const high = conversionU32[1]

    const resultHigh = (high >>> shift) >>> 0
    const highBits = (high & ((1 << shift) - 1)) << (32 - shift)
    const resultLow = ((low >>> shift) | highBits) >>> 0

    const lastBitMask = 1 << (shift - 1)
    const lastBit = (low & lastBitMask) !== 0

    const extraBitsMask = (1n << (BigInt(shift) - 1n)) - 1n
    const roundBitMask = (1n << (BigInt(shift) - 1n))
    const lsbBitMask = 1n << BigInt(shift)

    const lsbBit = (value & lsbBitMask) != 0n
    const roundBit = (value & roundBitMask) != 0n
    const hasTailBits = !hasZeroTail || (value & extraBitsMask) != 0n

    // const lowerBitsMask = lastBitMask - 1
    // const hasLowerBits = (low & lowerBitsMask) !== 0
    // if (lastBit && (hasLowerBits || hasZeroTail || ((resultLow & 1) !== 0))) {
    if (roundBit && (hasTailBits || lsbBit)) {
        let newLow = (resultLow + 1) >>> 0
        let newHigh = resultHigh
        if (newLow === 0) {
            newHigh = (newHigh + 1) >>> 0
        }
        conversionU32[0] = newLow
        conversionU32[1] = newHigh

        // conversionU32[0] = resultLow
        // conversionU32[1] = resultHigh
        return conversionU64[0] + 1n
    }

    conversionU32[0] = resultLow
    conversionU32[1] = resultHigh
    return conversionU64[0]
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
    // overflowDecimalExponent: 308
    overflowDecimalExponent: 324
}

const POW5_128 =
    [
        0xeef453d6923bd65an, 0x113faa2906a13b3fn,
        0x9558b4661b6565f8n, 0x4ac7ca59a424c507n,
        0xbaaee17fa23ebf76n, 0x5d79bcf00d2df649n,
        0xe95a99df8ace6f53n, 0xf4d82c2c107973dcn,
        0x91d8a02bb6c10594n, 0x79071b9b8a4be869n,
        0xb64ec836a47146f9n, 0x9748e2826cdee284n,
        0xe3e27a444d8d98b7n, 0xfd1b1b2308169b25n,
        0x8e6d8c6ab0787f72n, 0xfe30f0f5e50e20f7n,
        0xb208ef855c969f4fn, 0xbdbd2d335e51a935n,
        0xde8b2b66b3bc4723n, 0xad2c788035e61382n,
        0x8b16fb203055ac76n, 0x4c3bcb5021afcc31n,
        0xaddcb9e83c6b1793n, 0xdf4abe242a1bbf3dn,
        0xd953e8624b85dd78n, 0xd71d6dad34a2af0dn,
        0x87d4713d6f33aa6bn, 0x8672648c40e5ad68n,
        0xa9c98d8ccb009506n, 0x680efdaf511f18c2n,
        0xd43bf0effdc0ba48n, 0x212bd1b2566def2n,
        0x84a57695fe98746dn, 0x14bb630f7604b57n,
        0xa5ced43b7e3e9188n, 0x419ea3bd35385e2dn,
        0xcf42894a5dce35ean, 0x52064cac828675b9n,
        0x818995ce7aa0e1b2n, 0x7343efebd1940993n,
        0xa1ebfb4219491a1fn, 0x1014ebe6c5f90bf8n,
        0xca66fa129f9b60a6n, 0xd41a26e077774ef6n,
        0xfd00b897478238d0n, 0x8920b098955522b4n,
        0x9e20735e8cb16382n, 0x55b46e5f5d5535b0n,
        0xc5a890362fddbc62n, 0xeb2189f734aa831dn,
        0xf712b443bbd52b7bn, 0xa5e9ec7501d523e4n,
        0x9a6bb0aa55653b2dn, 0x47b233c92125366en,
        0xc1069cd4eabe89f8n, 0x999ec0bb696e840an,
        0xf148440a256e2c76n, 0xc00670ea43ca250dn,
        0x96cd2a865764dbcan, 0x380406926a5e5728n,
        0xbc807527ed3e12bcn, 0xc605083704f5ecf2n,
        0xeba09271e88d976bn, 0xf7864a44c633682en,
        0x93445b8731587ea3n, 0x7ab3ee6afbe0211dn,
        0xb8157268fdae9e4cn, 0x5960ea05bad82964n,
        0xe61acf033d1a45dfn, 0x6fb92487298e33bdn,
        0x8fd0c16206306babn, 0xa5d3b6d479f8e056n,
        0xb3c4f1ba87bc8696n, 0x8f48a4899877186cn,
        0xe0b62e2929aba83cn, 0x331acdabfe94de87n,
        0x8c71dcd9ba0b4925n, 0x9ff0c08b7f1d0b14n,
        0xaf8e5410288e1b6fn, 0x7ecf0ae5ee44dd9n,
        0xdb71e91432b1a24an, 0xc9e82cd9f69d6150n,
        0x892731ac9faf056en, 0xbe311c083a225cd2n,
        0xab70fe17c79ac6can, 0x6dbd630a48aaf406n,
        0xd64d3d9db981787dn, 0x92cbbccdad5b108n,
        0x85f0468293f0eb4en, 0x25bbf56008c58ea5n,
        0xa76c582338ed2621n, 0xaf2af2b80af6f24en,
        0xd1476e2c07286faan, 0x1af5af660db4aee1n,
        0x82cca4db847945can, 0x50d98d9fc890ed4dn,
        0xa37fce126597973cn, 0xe50ff107bab528a0n,
        0xcc5fc196fefd7d0cn, 0x1e53ed49a96272c8n,
        0xff77b1fcbebcdc4fn, 0x25e8e89c13bb0f7an,
        0x9faacf3df73609b1n, 0x77b191618c54e9acn,
        0xc795830d75038c1dn, 0xd59df5b9ef6a2417n,
        0xf97ae3d0d2446f25n, 0x4b0573286b44ad1dn,
        0x9becce62836ac577n, 0x4ee367f9430aec32n,
        0xc2e801fb244576d5n, 0x229c41f793cda73fn,
        0xf3a20279ed56d48an, 0x6b43527578c1110fn,
        0x9845418c345644d6n, 0x830a13896b78aaa9n,
        0xbe5691ef416bd60cn, 0x23cc986bc656d553n,
        0xedec366b11c6cb8fn, 0x2cbfbe86b7ec8aa8n,
        0x94b3a202eb1c3f39n, 0x7bf7d71432f3d6a9n,
        0xb9e08a83a5e34f07n, 0xdaf5ccd93fb0cc53n,
        0xe858ad248f5c22c9n, 0xd1b3400f8f9cff68n,
        0x91376c36d99995ben, 0x23100809b9c21fa1n,
        0xb58547448ffffb2dn, 0xabd40a0c2832a78an,
        0xe2e69915b3fff9f9n, 0x16c90c8f323f516cn,
        0x8dd01fad907ffc3bn, 0xae3da7d97f6792e3n,
        0xb1442798f49ffb4an, 0x99cd11cfdf41779cn,
        0xdd95317f31c7fa1dn, 0x40405643d711d583n,
        0x8a7d3eef7f1cfc52n, 0x482835ea666b2572n,
        0xad1c8eab5ee43b66n, 0xda3243650005eecfn,
        0xd863b256369d4a40n, 0x90bed43e40076a82n,
        0x873e4f75e2224e68n, 0x5a7744a6e804a291n,
        0xa90de3535aaae202n, 0x711515d0a205cb36n,
        0xd3515c2831559a83n, 0xd5a5b44ca873e03n,
        0x8412d9991ed58091n, 0xe858790afe9486c2n,
        0xa5178fff668ae0b6n, 0x626e974dbe39a872n,
        0xce5d73ff402d98e3n, 0xfb0a3d212dc8128fn,
        0x80fa687f881c7f8en, 0x7ce66634bc9d0b99n,
        0xa139029f6a239f72n, 0x1c1fffc1ebc44e80n,
        0xc987434744ac874en, 0xa327ffb266b56220n,
        0xfbe9141915d7a922n, 0x4bf1ff9f0062baa8n,
        0x9d71ac8fada6c9b5n, 0x6f773fc3603db4a9n,
        0xc4ce17b399107c22n, 0xcb550fb4384d21d3n,
        0xf6019da07f549b2bn, 0x7e2a53a146606a48n,
        0x99c102844f94e0fbn, 0x2eda7444cbfc426dn,
        0xc0314325637a1939n, 0xfa911155fefb5308n,
        0xf03d93eebc589f88n, 0x793555ab7eba27can,
        0x96267c7535b763b5n, 0x4bc1558b2f3458den,
        0xbbb01b9283253ca2n, 0x9eb1aaedfb016f16n,
        0xea9c227723ee8bcbn, 0x465e15a979c1cadcn,
        0x92a1958a7675175fn, 0xbfacd89ec191ec9n,
        0xb749faed14125d36n, 0xcef980ec671f667bn,
        0xe51c79a85916f484n, 0x82b7e12780e7401an,
        0x8f31cc0937ae58d2n, 0xd1b2ecb8b0908810n,
        0xb2fe3f0b8599ef07n, 0x861fa7e6dcb4aa15n,
        0xdfbdcece67006ac9n, 0x67a791e093e1d49an,
        0x8bd6a141006042bdn, 0xe0c8bb2c5c6d24e0n,
        0xaecc49914078536dn, 0x58fae9f773886e18n,
        0xda7f5bf590966848n, 0xaf39a475506a899en,
        0x888f99797a5e012dn, 0x6d8406c952429603n,
        0xaab37fd7d8f58178n, 0xc8e5087ba6d33b83n,
        0xd5605fcdcf32e1d6n, 0xfb1e4a9a90880a64n,
        0x855c3be0a17fcd26n, 0x5cf2eea09a55067fn,
        0xa6b34ad8c9dfc06fn, 0xf42faa48c0ea481en,
        0xd0601d8efc57b08bn, 0xf13b94daf124da26n,
        0x823c12795db6ce57n, 0x76c53d08d6b70858n,
        0xa2cb1717b52481edn, 0x54768c4b0c64ca6en,
        0xcb7ddcdda26da268n, 0xa9942f5dcf7dfd09n,
        0xfe5d54150b090b02n, 0xd3f93b35435d7c4cn,
        0x9efa548d26e5a6e1n, 0xc47bc5014a1a6dafn,
        0xc6b8e9b0709f109an, 0x359ab6419ca1091bn,
        0xf867241c8cc6d4c0n, 0xc30163d203c94b62n,
        0x9b407691d7fc44f8n, 0x79e0de63425dcf1dn,
        0xc21094364dfb5636n, 0x985915fc12f542e4n,
        0xf294b943e17a2bc4n, 0x3e6f5b7b17b2939dn,
        0x979cf3ca6cec5b5an, 0xa705992ceecf9c42n,
        0xbd8430bd08277231n, 0x50c6ff782a838353n,
        0xece53cec4a314ebdn, 0xa4f8bf5635246428n,
        0x940f4613ae5ed136n, 0x871b7795e136be99n,
        0xb913179899f68584n, 0x28e2557b59846e3fn,
        0xe757dd7ec07426e5n, 0x331aeada2fe589cfn,
        0x9096ea6f3848984fn, 0x3ff0d2c85def7621n,
        0xb4bca50b065abe63n, 0xfed077a756b53a9n,
        0xe1ebce4dc7f16dfbn, 0xd3e8495912c62894n,
        0x8d3360f09cf6e4bdn, 0x64712dd7abbbd95cn,
        0xb080392cc4349decn, 0xbd8d794d96aacfb3n,
        0xdca04777f541c567n, 0xecf0d7a0fc5583a0n,
        0x89e42caaf9491b60n, 0xf41686c49db57244n,
        0xac5d37d5b79b6239n, 0x311c2875c522ced5n,
        0xd77485cb25823ac7n, 0x7d633293366b828bn,
        0x86a8d39ef77164bcn, 0xae5dff9c02033197n,
        0xa8530886b54dbdebn, 0xd9f57f830283fdfcn,
        0xd267caa862a12d66n, 0xd072df63c324fd7bn,
        0x8380dea93da4bc60n, 0x4247cb9e59f71e6dn,
        0xa46116538d0deb78n, 0x52d9be85f074e608n,
        0xcd795be870516656n, 0x67902e276c921f8bn,
        0x806bd9714632dff6n, 0xba1cd8a3db53b6n,
        0xa086cfcd97bf97f3n, 0x80e8a40eccd228a4n,
        0xc8a883c0fdaf7df0n, 0x6122cd128006b2cdn,
        0xfad2a4b13d1b5d6cn, 0x796b805720085f81n,
        0x9cc3a6eec6311a63n, 0xcbe3303674053bb0n,
        0xc3f490aa77bd60fcn, 0xbedbfc4411068a9cn,
        0xf4f1b4d515acb93bn, 0xee92fb5515482d44n,
        0x991711052d8bf3c5n, 0x751bdd152d4d1c4an,
        0xbf5cd54678eef0b6n, 0xd262d45a78a0635dn,
        0xef340a98172aace4n, 0x86fb897116c87c34n,
        0x9580869f0e7aac0en, 0xd45d35e6ae3d4da0n,
        0xbae0a846d2195712n, 0x8974836059cca109n,
        0xe998d258869facd7n, 0x2bd1a438703fc94bn,
        0x91ff83775423cc06n, 0x7b6306a34627ddcfn,
        0xb67f6455292cbf08n, 0x1a3bc84c17b1d542n,
        0xe41f3d6a7377eecan, 0x20caba5f1d9e4a93n,
        0x8e938662882af53en, 0x547eb47b7282ee9cn,
        0xb23867fb2a35b28dn, 0xe99e619a4f23aa43n,
        0xdec681f9f4c31f31n, 0x6405fa00e2ec94d4n,
        0x8b3c113c38f9f37en, 0xde83bc408dd3dd04n,
        0xae0b158b4738705en, 0x9624ab50b148d445n,
        0xd98ddaee19068c76n, 0x3badd624dd9b0957n,
        0x87f8a8d4cfa417c9n, 0xe54ca5d70a80e5d6n,
        0xa9f6d30a038d1dbcn, 0x5e9fcf4ccd211f4cn,
        0xd47487cc8470652bn, 0x7647c3200069671fn,
        0x84c8d4dfd2c63f3bn, 0x29ecd9f40041e073n,
        0xa5fb0a17c777cf09n, 0xf468107100525890n,
        0xcf79cc9db955c2ccn, 0x7182148d4066eeb4n,
        0x81ac1fe293d599bfn, 0xc6f14cd848405530n,
        0xa21727db38cb002fn, 0xb8ada00e5a506a7cn,
        0xca9cf1d206fdc03bn, 0xa6d90811f0e4851cn,
        0xfd442e4688bd304an, 0x908f4a166d1da663n,
        0x9e4a9cec15763e2en, 0x9a598e4e043287fen,
        0xc5dd44271ad3cdban, 0x40eff1e1853f29fdn,
        0xf7549530e188c128n, 0xd12bee59e68ef47cn,
        0x9a94dd3e8cf578b9n, 0x82bb74f8301958cen,
        0xc13a148e3032d6e7n, 0xe36a52363c1faf01n,
        0xf18899b1bc3f8ca1n, 0xdc44e6c3cb279ac1n,
        0x96f5600f15a7b7e5n, 0x29ab103a5ef8c0b9n,
        0xbcb2b812db11a5den, 0x7415d448f6b6f0e7n,
        0xebdf661791d60f56n, 0x111b495b3464ad21n,
        0x936b9fcebb25c995n, 0xcab10dd900beec34n,
        0xb84687c269ef3bfbn, 0x3d5d514f40eea742n,
        0xe65829b3046b0afan, 0xcb4a5a3112a5112n,
        0x8ff71a0fe2c2e6dcn, 0x47f0e785eaba72abn,
        0xb3f4e093db73a093n, 0x59ed216765690f56n,
        0xe0f218b8d25088b8n, 0x306869c13ec3532cn,
        0x8c974f7383725573n, 0x1e414218c73a13fbn,
        0xafbd2350644eeacfn, 0xe5d1929ef90898fan,
        0xdbac6c247d62a583n, 0xdf45f746b74abf39n,
        0x894bc396ce5da772n, 0x6b8bba8c328eb783n,
        0xab9eb47c81f5114fn, 0x66ea92f3f326564n,
        0xd686619ba27255a2n, 0xc80a537b0efefebdn,
        0x8613fd0145877585n, 0xbd06742ce95f5f36n,
        0xa798fc4196e952e7n, 0x2c48113823b73704n,
        0xd17f3b51fca3a7a0n, 0xf75a15862ca504c5n,
        0x82ef85133de648c4n, 0x9a984d73dbe722fbn,
        0xa3ab66580d5fdaf5n, 0xc13e60d0d2e0ebban,
        0xcc963fee10b7d1b3n, 0x318df905079926a8n,
        0xffbbcfe994e5c61fn, 0xfdf17746497f7052n,
        0x9fd561f1fd0f9bd3n, 0xfeb6ea8bedefa633n,
        0xc7caba6e7c5382c8n, 0xfe64a52ee96b8fc0n,
        0xf9bd690a1b68637bn, 0x3dfdce7aa3c673b0n,
        0x9c1661a651213e2dn, 0x6bea10ca65c084en,
        0xc31bfa0fe5698db8n, 0x486e494fcff30a62n,
        0xf3e2f893dec3f126n, 0x5a89dba3c3efccfan,
        0x986ddb5c6b3a76b7n, 0xf89629465a75e01cn,
        0xbe89523386091465n, 0xf6bbb397f1135823n,
        0xee2ba6c0678b597fn, 0x746aa07ded582e2cn,
        0x94db483840b717efn, 0xa8c2a44eb4571cdcn,
        0xba121a4650e4ddebn, 0x92f34d62616ce413n,
        0xe896a0d7e51e1566n, 0x77b020baf9c81d17n,
        0x915e2486ef32cd60n, 0xace1474dc1d122en,
        0xb5b5ada8aaff80b8n, 0xd819992132456ban,
        0xe3231912d5bf60e6n, 0x10e1fff697ed6c69n,
        0x8df5efabc5979c8fn, 0xca8d3ffa1ef463c1n,
        0xb1736b96b6fd83b3n, 0xbd308ff8a6b17cb2n,
        0xddd0467c64bce4a0n, 0xac7cb3f6d05ddbden,
        0x8aa22c0dbef60ee4n, 0x6bcdf07a423aa96bn,
        0xad4ab7112eb3929dn, 0x86c16c98d2c953c6n,
        0xd89d64d57a607744n, 0xe871c7bf077ba8b7n,
        0x87625f056c7c4a8bn, 0x11471cd764ad4972n,
        0xa93af6c6c79b5d2dn, 0xd598e40d3dd89bcfn,
        0xd389b47879823479n, 0x4aff1d108d4ec2c3n,
        0x843610cb4bf160cbn, 0xcedf722a585139ban,
        0xa54394fe1eedb8fen, 0xc2974eb4ee658828n,
        0xce947a3da6a9273en, 0x733d226229feea32n,
        0x811ccc668829b887n, 0x806357d5a3f525fn,
        0xa163ff802a3426a8n, 0xca07c2dcb0cf26f7n,
        0xc9bcff6034c13052n, 0xfc89b393dd02f0b5n,
        0xfc2c3f3841f17c67n, 0xbbac2078d443ace2n,
        0x9d9ba7832936edc0n, 0xd54b944b84aa4c0dn,
        0xc5029163f384a931n, 0xa9e795e65d4df11n,
        0xf64335bcf065d37dn, 0x4d4617b5ff4a16d5n,
        0x99ea0196163fa42en, 0x504bced1bf8e4e45n,
        0xc06481fb9bcf8d39n, 0xe45ec2862f71e1d6n,
        0xf07da27a82c37088n, 0x5d767327bb4e5a4cn,
        0x964e858c91ba2655n, 0x3a6a07f8d510f86fn,
        0xbbe226efb628afean, 0x890489f70a55368bn,
        0xeadab0aba3b2dbe5n, 0x2b45ac74ccea842en,
        0x92c8ae6b464fc96fn, 0x3b0b8bc90012929dn,
        0xb77ada0617e3bbcbn, 0x9ce6ebb40173744n,
        0xe55990879ddcaabdn, 0xcc420a6a101d0515n,
        0x8f57fa54c2a9eab6n, 0x9fa946824a12232dn,
        0xb32df8e9f3546564n, 0x47939822dc96abf9n,
        0xdff9772470297ebdn, 0x59787e2b93bc56f7n,
        0x8bfbea76c619ef36n, 0x57eb4edb3c55b65an,
        0xaefae51477a06b03n, 0xede622920b6b23f1n,
        0xdab99e59958885c4n, 0xe95fab368e45ecedn,
        0x88b402f7fd75539bn, 0x11dbcb0218ebb414n,
        0xaae103b5fcd2a881n, 0xd652bdc29f26a119n,
        0xd59944a37c0752a2n, 0x4be76d3346f0495fn,
        0x857fcae62d8493a5n, 0x6f70a4400c562ddbn,
        0xa6dfbd9fb8e5b88en, 0xcb4ccd500f6bb952n,
        0xd097ad07a71f26b2n, 0x7e2000a41346a7a7n,
        0x825ecc24c873782fn, 0x8ed400668c0c28c8n,
        0xa2f67f2dfa90563bn, 0x728900802f0f32fan,
        0xcbb41ef979346bcan, 0x4f2b40a03ad2ffb9n,
        0xfea126b7d78186bcn, 0xe2f610c84987bfa8n,
        0x9f24b832e6b0f436n, 0xdd9ca7d2df4d7c9n,
        0xc6ede63fa05d3143n, 0x91503d1c79720dbbn,
        0xf8a95fcf88747d94n, 0x75a44c6397ce912an,
        0x9b69dbe1b548ce7cn, 0xc986afbe3ee11aban,
        0xc24452da229b021bn, 0xfbe85badce996168n,
        0xf2d56790ab41c2a2n, 0xfae27299423fb9c3n,
        0x97c560ba6b0919a5n, 0xdccd879fc967d41an,
        0xbdb6b8e905cb600fn, 0x5400e987bbc1c920n,
        0xed246723473e3813n, 0x290123e9aab23b68n,
        0x9436c0760c86e30bn, 0xf9a0b6720aaf6521n,
        0xb94470938fa89bcen, 0xf808e40e8d5b3e69n,
        0xe7958cb87392c2c2n, 0xb60b1d1230b20e04n,
        0x90bd77f3483bb9b9n, 0xb1c6f22b5e6f48c2n,
        0xb4ecd5f01a4aa828n, 0x1e38aeb6360b1af3n,
        0xe2280b6c20dd5232n, 0x25c6da63c38de1b0n,
        0x8d590723948a535fn, 0x579c487e5a38ad0en,
        0xb0af48ec79ace837n, 0x2d835a9df0c6d851n,
        0xdcdb1b2798182244n, 0xf8e431456cf88e65n,
        0x8a08f0f8bf0f156bn, 0x1b8e9ecb641b58ffn,
        0xac8b2d36eed2dac5n, 0xe272467e3d222f3fn,
        0xd7adf884aa879177n, 0x5b0ed81dcc6abb0fn,
        0x86ccbb52ea94baean, 0x98e947129fc2b4e9n,
        0xa87fea27a539e9a5n, 0x3f2398d747b36224n,
        0xd29fe4b18e88640en, 0x8eec7f0d19a03aadn,
        0x83a3eeeef9153e89n, 0x1953cf68300424acn,
        0xa48ceaaab75a8e2bn, 0x5fa8c3423c052dd7n,
        0xcdb02555653131b6n, 0x3792f412cb06794dn,
        0x808e17555f3ebf11n, 0xe2bbd88bbee40bd0n,
        0xa0b19d2ab70e6ed6n, 0x5b6aceaeae9d0ec4n,
        0xc8de047564d20a8bn, 0xf245825a5a445275n,
        0xfb158592be068d2en, 0xeed6e2f0f0d56712n,
        0x9ced737bb6c4183dn, 0x55464dd69685606bn,
        0xc428d05aa4751e4cn, 0xaa97e14c3c26b886n,
        0xf53304714d9265dfn, 0xd53dd99f4b3066a8n,
        0x993fe2c6d07b7fabn, 0xe546a8038efe4029n,
        0xbf8fdb78849a5f96n, 0xde98520472bdd033n,
        0xef73d256a5c0f77cn, 0x963e66858f6d4440n,
        0x95a8637627989aadn, 0xdde7001379a44aa8n,
        0xbb127c53b17ec159n, 0x5560c018580d5d52n,
        0xe9d71b689dde71afn, 0xaab8f01e6e10b4a6n,
        0x9226712162ab070dn, 0xcab3961304ca70e8n,
        0xb6b00d69bb55c8d1n, 0x3d607b97c5fd0d22n,
        0xe45c10c42a2b3b05n, 0x8cb89a7db77c506an,
        0x8eb98a7a9a5b04e3n, 0x77f3608e92adb242n,
        0xb267ed1940f1c61cn, 0x55f038b237591ed3n,
        0xdf01e85f912e37a3n, 0x6b6c46dec52f6688n,
        0x8b61313bbabce2c6n, 0x2323ac4b3b3da015n,
        0xae397d8aa96c1b77n, 0xabec975e0a0d081an,
        0xd9c7dced53c72255n, 0x96e7bd358c904a21n,
        0x881cea14545c7575n, 0x7e50d64177da2e54n,
        0xaa242499697392d2n, 0xdde50bd1d5d0b9e9n,
        0xd4ad2dbfc3d07787n, 0x955e4ec64b44e864n,
        0x84ec3c97da624ab4n, 0xbd5af13bef0b113en,
        0xa6274bbdd0fadd61n, 0xecb1ad8aeacdd58en,
        0xcfb11ead453994ban, 0x67de18eda5814af2n,
        0x81ceb32c4b43fcf4n, 0x80eacf948770ced7n,
        0xa2425ff75e14fc31n, 0xa1258379a94d028dn,
        0xcad2f7f5359a3b3en, 0x96ee45813a04330n,
        0xfd87b5f28300ca0dn, 0x8bca9d6e188853fcn,
        0x9e74d1b791e07e48n, 0x775ea264cf55347en,
        0xc612062576589ddan, 0x95364afe032a819en,
        0xf79687aed3eec551n, 0x3a83ddbd83f52205n,
        0x9abe14cd44753b52n, 0xc4926a9672793543n,
        0xc16d9a0095928a27n, 0x75b7053c0f178294n,
        0xf1c90080baf72cb1n, 0x5324c68b12dd6339n,
        0x971da05074da7been, 0xd3f6fc16ebca5e04n,
        0xbce5086492111aean, 0x88f4bb1ca6bcf585n,
        0xec1e4a7db69561a5n, 0x2b31e9e3d06c32e6n,
        0x9392ee8e921d5d07n, 0x3aff322e62439fd0n,
        0xb877aa3236a4b449n, 0x9befeb9fad487c3n,
        0xe69594bec44de15bn, 0x4c2ebe687989a9b4n,
        0x901d7cf73ab0acd9n, 0xf9d37014bf60a11n,
        0xb424dc35095cd80fn, 0x538484c19ef38c95n,
        0xe12e13424bb40e13n, 0x2865a5f206b06fban,
        0x8cbccc096f5088cbn, 0xf93f87b7442e45d4n,
        0xafebff0bcb24aafen, 0xf78f69a51539d749n,
        0xdbe6fecebdedd5ben, 0xb573440e5a884d1cn,
        0x89705f4136b4a597n, 0x31680a88f8953031n,
        0xabcc77118461cefcn, 0xfdc20d2b36ba7c3en,
        0xd6bf94d5e57a42bcn, 0x3d32907604691b4dn,
        0x8637bd05af6c69b5n, 0xa63f9a49c2c1b110n,
        0xa7c5ac471b478423n, 0xfcf80dc33721d54n,
        0xd1b71758e219652bn, 0xd3c36113404ea4a9n,
        0x83126e978d4fdf3bn, 0x645a1cac083126ean,
        0xa3d70a3d70a3d70an, 0x3d70a3d70a3d70a4n,
        0xccccccccccccccccn, 0xcccccccccccccccdn,
        0x8000000000000000n, 0x0n,
        0xa000000000000000n, 0x0n,
        0xc800000000000000n, 0x0n,
        0xfa00000000000000n, 0x0n,
        0x9c40000000000000n, 0x0n,
        0xc350000000000000n, 0x0n,
        0xf424000000000000n, 0x0n,
        0x9896800000000000n, 0x0n,
        0xbebc200000000000n, 0x0n,
        0xee6b280000000000n, 0x0n,
        0x9502f90000000000n, 0x0n,
        0xba43b74000000000n, 0x0n,
        0xe8d4a51000000000n, 0x0n,
        0x9184e72a00000000n, 0x0n,
        0xb5e620f480000000n, 0x0n,
        0xe35fa931a0000000n, 0x0n,
        0x8e1bc9bf04000000n, 0x0n,
        0xb1a2bc2ec5000000n, 0x0n,
        0xde0b6b3a76400000n, 0x0n,
        0x8ac7230489e80000n, 0x0n,
        0xad78ebc5ac620000n, 0x0n,
        0xd8d726b7177a8000n, 0x0n,
        0x878678326eac9000n, 0x0n,
        0xa968163f0a57b400n, 0x0n,
        0xd3c21bcecceda100n, 0x0n,
        0x84595161401484a0n, 0x0n,
        0xa56fa5b99019a5c8n, 0x0n,
        0xcecb8f27f4200f3an, 0x0n,
        0x813f3978f8940984n, 0x4000000000000000n,
        0xa18f07d736b90be5n, 0x5000000000000000n,
        0xc9f2c9cd04674eden, 0xa400000000000000n,
        0xfc6f7c4045812296n, 0x4d00000000000000n,
        0x9dc5ada82b70b59dn, 0xf020000000000000n,
        0xc5371912364ce305n, 0x6c28000000000000n,
        0xf684df56c3e01bc6n, 0xc732000000000000n,
        0x9a130b963a6c115cn, 0x3c7f400000000000n,
        0xc097ce7bc90715b3n, 0x4b9f100000000000n,
        0xf0bdc21abb48db20n, 0x1e86d40000000000n,
        0x96769950b50d88f4n, 0x1314448000000000n,
        0xbc143fa4e250eb31n, 0x17d955a000000000n,
        0xeb194f8e1ae525fdn, 0x5dcfab0800000000n,
        0x92efd1b8d0cf37ben, 0x5aa1cae500000000n,
        0xb7abc627050305adn, 0xf14a3d9e40000000n,
        0xe596b7b0c643c719n, 0x6d9ccd05d0000000n,
        0x8f7e32ce7bea5c6fn, 0xe4820023a2000000n,
        0xb35dbf821ae4f38bn, 0xdda2802c8a800000n,
        0xe0352f62a19e306en, 0xd50b2037ad200000n,
        0x8c213d9da502de45n, 0x4526f422cc340000n,
        0xaf298d050e4395d6n, 0x9670b12b7f410000n,
        0xdaf3f04651d47b4cn, 0x3c0cdd765f114000n,
        0x88d8762bf324cd0fn, 0xa5880a69fb6ac800n,
        0xab0e93b6efee0053n, 0x8eea0d047a457a00n,
        0xd5d238a4abe98068n, 0x72a4904598d6d880n,
        0x85a36366eb71f041n, 0x47a6da2b7f864750n,
        0xa70c3c40a64e6c51n, 0x999090b65f67d924n,
        0xd0cf4b50cfe20765n, 0xfff4b4e3f741cf6dn,
        0x82818f1281ed449fn, 0xbff8f10e7a8921a4n,
        0xa321f2d7226895c7n, 0xaff72d52192b6a0dn,
        0xcbea6f8ceb02bb39n, 0x9bf4f8a69f764490n,
        0xfee50b7025c36a08n, 0x2f236d04753d5b4n,
        0x9f4f2726179a2245n, 0x1d762422c946590n,
        0xc722f0ef9d80aad6n, 0x424d3ad2b7b97ef5n,
        0xf8ebad2b84e0d58bn, 0xd2e0898765a7deb2n,
        0x9b934c3b330c8577n, 0x63cc55f49f88eb2fn,
        0xc2781f49ffcfa6d5n, 0x3cbf6b71c76b25fbn,
        0xf316271c7fc3908an, 0x8bef464e3945ef7an,
        0x97edd871cfda3a56n, 0x97758bf0e3cbb5acn,
        0xbde94e8e43d0c8ecn, 0x3d52eeed1cbea317n,
        0xed63a231d4c4fb27n, 0x4ca7aaa863ee4bddn,
        0x945e455f24fb1cf8n, 0x8fe8caa93e74ef6an,
        0xb975d6b6ee39e436n, 0xb3e2fd538e122b44n,
        0xe7d34c64a9c85d44n, 0x60dbbca87196b616n,
        0x90e40fbeea1d3a4an, 0xbc8955e946fe31cdn,
        0xb51d13aea4a488ddn, 0x6babab6398bdbe41n,
        0xe264589a4dcdab14n, 0xc696963c7eed2dd1n,
        0x8d7eb76070a08aecn, 0xfc1e1de5cf543ca2n,
        0xb0de65388cc8ada8n, 0x3b25a55f43294bcbn,
        0xdd15fe86affad912n, 0x49ef0eb713f39eben,
        0x8a2dbf142dfcc7abn, 0x6e3569326c784337n,
        0xacb92ed9397bf996n, 0x49c2c37f07965404n,
        0xd7e77a8f87daf7fbn, 0xdc33745ec97be906n,
        0x86f0ac99b4e8dafdn, 0x69a028bb3ded71a3n,
        0xa8acd7c0222311bcn, 0xc40832ea0d68ce0cn,
        0xd2d80db02aabd62bn, 0xf50a3fa490c30190n,
        0x83c7088e1aab65dbn, 0x792667c6da79e0fan,
        0xa4b8cab1a1563f52n, 0x577001b891185938n,
        0xcde6fd5e09abcf26n, 0xed4c0226b55e6f86n,
        0x80b05e5ac60b6178n, 0x544f8158315b05b4n,
        0xa0dc75f1778e39d6n, 0x696361ae3db1c721n,
        0xc913936dd571c84cn, 0x3bc3a19cd1e38e9n,
        0xfb5878494ace3a5fn, 0x4ab48a04065c723n,
        0x9d174b2dcec0e47bn, 0x62eb0d64283f9c76n,
        0xc45d1df942711d9an, 0x3ba5d0bd324f8394n,
        0xf5746577930d6500n, 0xca8f44ec7ee36479n,
        0x9968bf6abbe85f20n, 0x7e998b13cf4e1ecbn,
        0xbfc2ef456ae276e8n, 0x9e3fedd8c321a67en,
        0xefb3ab16c59b14a2n, 0xc5cfe94ef3ea101en,
        0x95d04aee3b80ece5n, 0xbba1f1d158724a12n,
        0xbb445da9ca61281fn, 0x2a8a6e45ae8edc97n,
        0xea1575143cf97226n, 0xf52d09d71a3293bdn,
        0x924d692ca61be758n, 0x593c2626705f9c56n,
        0xb6e0c377cfa2e12en, 0x6f8b2fb00c77836cn,
        0xe498f455c38b997an, 0xb6dfb9c0f956447n,
        0x8edf98b59a373fecn, 0x4724bd4189bd5eacn,
        0xb2977ee300c50fe7n, 0x58edec91ec2cb657n,
        0xdf3d5e9bc0f653e1n, 0x2f2967b66737e3edn,
        0x8b865b215899f46cn, 0xbd79e0d20082ee74n,
        0xae67f1e9aec07187n, 0xecd8590680a3aa11n,
        0xda01ee641a708de9n, 0xe80e6f4820cc9495n,
        0x884134fe908658b2n, 0x3109058d147fdcddn,
        0xaa51823e34a7eeden, 0xbd4b46f0599fd415n,
        0xd4e5e2cdc1d1ea96n, 0x6c9e18ac7007c91an,
        0x850fadc09923329en, 0x3e2cf6bc604ddb0n,
        0xa6539930bf6bff45n, 0x84db8346b786151cn,
        0xcfe87f7cef46ff16n, 0xe612641865679a63n,
        0x81f14fae158c5f6en, 0x4fcb7e8f3f60c07en,
        0xa26da3999aef7749n, 0xe3be5e330f38f09dn,
        0xcb090c8001ab551cn, 0x5cadf5bfd3072cc5n,
        0xfdcb4fa002162a63n, 0x73d9732fc7c8f7f6n,
        0x9e9f11c4014dda7en, 0x2867e7fddcdd9afan,
        0xc646d63501a1511dn, 0xb281e1fd541501b8n,
        0xf7d88bc24209a565n, 0x1f225a7ca91a4226n,
        0x9ae757596946075fn, 0x3375788de9b06958n,
        0xc1a12d2fc3978937n, 0x52d6b1641c83aen,
        0xf209787bb47d6b84n, 0xc0678c5dbd23a49an,
        0x9745eb4d50ce6332n, 0xf840b7ba963646e0n,
        0xbd176620a501fbffn, 0xb650e5a93bc3d898n,
        0xec5d3fa8ce427affn, 0xa3e51f138ab4ceben,
        0x93ba47c980e98cdfn, 0xc66f336c36b10137n,
        0xb8a8d9bbe123f017n, 0xb80b0047445d4184n,
        0xe6d3102ad96cec1dn, 0xa60dc059157491e5n,
        0x9043ea1ac7e41392n, 0x87c89837ad68db2fn,
        0xb454e4a179dd1877n, 0x29babe4598c311fbn,
        0xe16a1dc9d8545e94n, 0xf4296dd6fef3d67an,
        0x8ce2529e2734bb1dn, 0x1899e4a65f58660cn,
        0xb01ae745b101e9e4n, 0x5ec05dcff72e7f8fn,
        0xdc21a1171d42645dn, 0x76707543f4fa1f73n,
        0x899504ae72497eban, 0x6a06494a791c53a8n,
        0xabfa45da0edbde69n, 0x487db9d17636892n,
        0xd6f8d7509292d603n, 0x45a9d2845d3c42b6n,
        0x865b86925b9bc5c2n, 0xb8a2392ba45a9b2n,
        0xa7f26836f282b732n, 0x8e6cac7768d7141en,
        0xd1ef0244af2364ffn, 0x3207d795430cd926n,
        0x8335616aed761f1fn, 0x7f44e6bd49e807b8n,
        0xa402b9c5a8d3a6e7n, 0x5f16206c9c6209a6n,
        0xcd036837130890a1n, 0x36dba887c37a8c0fn,
        0x802221226be55a64n, 0xc2494954da2c9789n,
        0xa02aa96b06deb0fdn, 0xf2db9baa10b7bd6cn,
        0xc83553c5c8965d3dn, 0x6f92829494e5acc7n,
        0xfa42a8b73abbf48cn, 0xcb772339ba1f17f9n,
        0x9c69a97284b578d7n, 0xff2a760414536efbn,
        0xc38413cf25e2d70dn, 0xfef5138519684aban,
        0xf46518c2ef5b8cd1n, 0x7eb258665fc25d69n,
        0x98bf2f79d5993802n, 0xef2f773ffbd97a61n,
        0xbeeefb584aff8603n, 0xaafb550ffacfd8fan,
        0xeeaaba2e5dbf6784n, 0x95ba2a53f983cf38n,
        0x952ab45cfa97a0b2n, 0xdd945a747bf26183n,
        0xba756174393d88dfn, 0x94f971119aeef9e4n,
        0xe912b9d1478ceb17n, 0x7a37cd5601aab85dn,
        0x91abb422ccb812een, 0xac62e055c10ab33an,
        0xb616a12b7fe617aan, 0x577b986b314d6009n,
        0xe39c49765fdf9d94n, 0xed5a7e85fda0b80bn,
        0x8e41ade9fbebc27dn, 0x14588f13be847307n,
        0xb1d219647ae6b31cn, 0x596eb2d8ae258fc8n,
        0xde469fbd99a05fe3n, 0x6fca5f8ed9aef3bbn,
        0x8aec23d680043been, 0x25de7bb9480d5854n,
        0xada72ccc20054ae9n, 0xaf561aa79a10ae6an,
        0xd910f7ff28069da4n, 0x1b2ba1518094da04n,
        0x87aa9aff79042286n, 0x90fb44d2f05d0842n,
        0xa99541bf57452b28n, 0x353a1607ac744a53n,
        0xd3fa922f2d1675f2n, 0x42889b8997915ce8n,
        0x847c9b5d7c2e09b7n, 0x69956135febada11n,
        0xa59bc234db398c25n, 0x43fab9837e699095n,
        0xcf02b2c21207ef2en, 0x94f967e45e03f4bbn,
        0x8161afb94b44f57dn, 0x1d1be0eebac278f5n,
        0xa1ba1ba79e1632dcn, 0x6462d92a69731732n,
        0xca28a291859bbf93n, 0x7d7b8f7503cfdcfen,
        0xfcb2cb35e702af78n, 0x5cda735244c3d43en,
        0x9defbf01b061adabn, 0x3a0888136afa64a7n,
        0xc56baec21c7a1916n, 0x88aaa1845b8fdd0n,
        0xf6c69a72a3989f5bn, 0x8aad549e57273d45n,
        0x9a3c2087a63f6399n, 0x36ac54e2f678864bn,
        0xc0cb28a98fcf3c7fn, 0x84576a1bb416a7ddn,
        0xf0fdf2d3f3c30b9fn, 0x656d44a2a11c51d5n,
        0x969eb7c47859e743n, 0x9f644ae5a4b1b325n,
        0xbc4665b596706114n, 0x873d5d9f0dde1feen,
        0xeb57ff22fc0c7959n, 0xa90cb506d155a7ean,
        0x9316ff75dd87cbd8n, 0x9a7f12442d588f2n,
        0xb7dcbf5354e9becen, 0xc11ed6d538aeb2fn,
        0xe5d3ef282a242e81n, 0x8f1668c8a86da5fan,
        0x8fa475791a569d10n, 0xf96e017d694487bcn,
        0xb38d92d760ec4455n, 0x37c981dcc395a9acn,
        0xe070f78d3927556an, 0x85bbe253f47b1417n,
        0x8c469ab843b89562n, 0x93956d7478ccec8en,
        0xaf58416654a6babbn, 0x387ac8d1970027b2n,
        0xdb2e51bfe9d0696an, 0x6997b05fcc0319en,
        0x88fcf317f22241e2n, 0x441fece3bdf81f03n,
        0xab3c2fddeeaad25an, 0xd527e81cad7626c3n,
        0xd60b3bd56a5586f1n, 0x8a71e223d8d3b074n,
        0x85c7056562757456n, 0xf6872d5667844e49n,
        0xa738c6bebb12d16cn, 0xb428f8ac016561dbn,
        0xd106f86e69d785c7n, 0xe13336d701beba52n,
        0x82a45b450226b39cn, 0xecc0024661173473n,
        0xa34d721642b06084n, 0x27f002d7f95d0190n,
        0xcc20ce9bd35c78a5n, 0x31ec038df7b441f4n,
        0xff290242c83396cen, 0x7e67047175a15271n,
        0x9f79a169bd203e41n, 0xf0062c6e984d386n,
        0xc75809c42c684dd1n, 0x52c07b78a3e60868n,
        0xf92e0c3537826145n, 0xa7709a56ccdf8a82n,
        0x9bbcc7a142b17ccbn, 0x88a66076400bb691n,
        0xc2abf989935ddbfen, 0x6acff893d00ea435n,
        0xf356f7ebf83552fen, 0x583f6b8c4124d43n,
        0x98165af37b2153den, 0xc3727a337a8b704an,
        0xbe1bf1b059e9a8d6n, 0x744f18c0592e4c5cn,
        0xeda2ee1c7064130cn, 0x1162def06f79df73n,
        0x9485d4d1c63e8be7n, 0x8addcb5645ac2ba8n,
        0xb9a74a0637ce2ee1n, 0x6d953e2bd7173692n,
        0xe8111c87c5c1ba99n, 0xc8fa8db6ccdd0437n,
        0x910ab1d4db9914a0n, 0x1d9c9892400a22a2n,
        0xb54d5e4a127f59c8n, 0x2503beb6d00cab4bn,
        0xe2a0b5dc971f303an, 0x2e44ae64840fd61dn,
        0x8da471a9de737e24n, 0x5ceaecfed289e5d2n,
        0xb10d8e1456105dadn, 0x7425a83e872c5f47n,
        0xdd50f1996b947518n, 0xd12f124e28f77719n,
        0x8a5296ffe33cc92fn, 0x82bd6b70d99aaa6fn,
        0xace73cbfdc0bfb7bn, 0x636cc64d1001550bn,
        0xd8210befd30efa5an, 0x3c47f7e05401aa4en,
        0x8714a775e3e95c78n, 0x65acfaec34810a71n,
        0xa8d9d1535ce3b396n, 0x7f1839a741a14d0dn,
        0xd31045a8341ca07cn, 0x1ede48111209a050n,
        0x83ea2b892091e44dn, 0x934aed0aab460432n,
        0xa4e4b66b68b65d60n, 0xf81da84d5617853fn,
        0xce1de40642e3f4b9n, 0x36251260ab9d668en,
        0x80d2ae83e9ce78f3n, 0xc1d72b7c6b426019n,
        0xa1075a24e4421730n, 0xb24cf65b8612f81fn,
        0xc94930ae1d529cfcn, 0xdee033f26797b627n,
        0xfb9b7cd9a4a7443cn, 0x169840ef017da3b1n,
        0x9d412e0806e88aa5n, 0x8e1f289560ee864en,
        0xc491798a08a2ad4en, 0xf1a6f2bab92a27e2n,
        0xf5b5d7ec8acb58a2n, 0xae10af696774b1dbn,
        0x9991a6f3d6bf1765n, 0xacca6da1e0a8ef29n,
        0xbff610b0cc6edd3fn, 0x17fd090a58d32af3n,
        0xeff394dcff8a948en, 0xddfc4b4cef07f5b0n,
        0x95f83d0a1fb69cd9n, 0x4abdaf101564f98en,
        0xbb764c4ca7a4440fn, 0x9d6d1ad41abe37f1n,
        0xea53df5fd18d5513n, 0x84c86189216dc5edn,
        0x92746b9be2f8552cn, 0x32fd3cf5b4e49bb4n,
        0xb7118682dbb66a77n, 0x3fbc8c33221dc2a1n,
        0xe4d5e82392a40515n, 0xfabaf3feaa5334an,
        0x8f05b1163ba6832dn, 0x29cb4d87f2a7400en,
        0xb2c71d5bca9023f8n, 0x743e20e9ef511012n,
        0xdf78e4b2bd342cf6n, 0x914da9246b255416n,
        0x8bab8eefb6409c1an, 0x1ad089b6c2f7548en,
        0xae9672aba3d0c320n, 0xa184ac2473b529b1n,
        0xda3c0f568cc4f3e8n, 0xc9e5d72d90a2741en,
        0x8865899617fb1871n, 0x7e2fa67c7a658892n,
        0xaa7eebfb9df9de8dn, 0xddbb901b98feeab7n,
        0xd51ea6fa85785631n, 0x552a74227f3ea565n,
        0x8533285c936b35den, 0xd53a88958f87275fn,
        0xa67ff273b8460356n, 0x8a892abaf368f137n,
        0xd01fef10a657842cn, 0x2d2b7569b0432d85n,
        0x8213f56a67f6b29bn, 0x9c3b29620e29fc73n,
        0xa298f2c501f45f42n, 0x8349f3ba91b47b8fn,
        0xcb3f2f7642717713n, 0x241c70a936219a73n,
        0xfe0efb53d30dd4d7n, 0xed238cd383aa0110n,
        0x9ec95d1463e8a506n, 0xf4363804324a40aan,
        0xc67bb4597ce2ce48n, 0xb143c6053edcd0d5n,
        0xf81aa16fdc1b81dan, 0xdd94b7868e94050an,
        0x9b10a4e5e9913128n, 0xca7cf2b4191c8326n,
        0xc1d4ce1f63f57d72n, 0xfd1c2f611f63a3f0n,
        0xf24a01a73cf2dccfn, 0xbc633b39673c8cecn,
        0x976e41088617ca01n, 0xd5be0503e085d813n,
        0xbd49d14aa79dbc82n, 0x4b2d8644d8a74e18n,
        0xec9c459d51852ba2n, 0xddf8e7d60ed1219en,
        0x93e1ab8252f33b45n, 0xcabb90e5c942b503n,
        0xb8da1662e7b00a17n, 0x3d6a751f3b936243n,
        0xe7109bfba19c0c9dn, 0xcc512670a783ad4n,
        0x906a617d450187e2n, 0x27fb2b80668b24c5n,
        0xb484f9dc9641e9dan, 0xb1f9f660802dedf6n,
        0xe1a63853bbd26451n, 0x5e7873f8a0396973n,
        0x8d07e33455637eb2n, 0xdb0b487b6423e1e8n,
        0xb049dc016abc5e5fn, 0x91ce1a9a3d2cda62n,
        0xdc5c5301c56b75f7n, 0x7641a140cc7810fbn,
        0x89b9b3e11b6329ban, 0xa9e904c87fcb0a9dn,
        0xac2820d9623bf429n, 0x546345fa9fbdcd44n,
        0xd732290fbacaf133n, 0xa97c177947ad4095n,
        0x867f59a9d4bed6c0n, 0x49ed8eabcccc485dn,
        0xa81f301449ee8c70n, 0x5c68f256bfff5a74n,
        0xd226fc195c6a2f8cn, 0x73832eec6fff3111n,
        0x83585d8fd9c25db7n, 0xc831fd53c5ff7eabn,
        0xa42e74f3d032f525n, 0xba3e7ca8b77f5e55n,
        0xcd3a1230c43fb26fn, 0x28ce1bd2e55f35ebn,
        0x80444b5e7aa7cf85n, 0x7980d163cf5b81b3n,
        0xa0555e361951c366n, 0xd7e105bcc332621fn,
        0xc86ab5c39fa63440n, 0x8dd9472bf3fefaa7n,
        0xfa856334878fc150n, 0xb14f98f6f0feb951n,
        0x9c935e00d4b9d8d2n, 0x6ed1bf9a569f33d3n,
        0xc3b8358109e84f07n, 0xa862f80ec4700c8n,
        0xf4a642e14c6262c8n, 0xcd27bb612758c0fan,
        0x98e7e9cccfbd7dbdn, 0x8038d51cb897789cn,
        0xbf21e44003acdd2cn, 0xe0470a63e6bd56c3n,
        0xeeea5d5004981478n, 0x1858ccfce06cac74n,
        0x95527a5202df0ccbn, 0xf37801e0c43ebc8n,
        0xbaa718e68396cffdn, 0xd30560258f54e6ban,
        0xe950df20247c83fdn, 0x47c6b82ef32a2069n,
        0x91d28b7416cdd27en, 0x4cdc331d57fa5441n,
        0xb6472e511c81471dn, 0xe0133fe4adf8e952n,
        0xe3d8f9e563a198e5n, 0x58180fddd97723a6n,
        0x8e679c2f5e44ff8fn, 0x570f09eaa7ea7648n
    ]