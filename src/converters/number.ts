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
    const MAX_4PACK_DIGITS = 12
    const MAX_SAFE_DIGITS = 15

    let i = start

    const PLUS = 43
    const MINUS = 45

    const STATE_NEGATIVE = 0x01  // bit 0
    const STATE_NONZERO = 0x02  // bit 1
    const STATE_DECIMAL = 0x04  // bit 2
    const STATE_END = 0x08

    let state = 0 >>> 0

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

    let scale = 0
    let numberOfTrailingZeros = 0

    let tempMantissa = 0
    let tempDigitsCount = 0

    while (tempDigitsCount < MAX_4PACK_DIGITS) {
        const b1 = bytes[i]
        const b2 = bytes[i + 1]
        const b3 = bytes[i + 2]
        const b4 = bytes[i + 3]

        if (isDigit(b1) && isDigit(b2) && isDigit(b3) && isDigit(b4)) {
            tempMantissa = tempMantissa * 10000 +
                ((((b1 & 0x0F) * 10 + (b2 & 0x0F)) * 10 + (b3 & 0x0F)) * 10 + (b4 & 0x0F))

            tempDigitsCount += 4
            scale += 4
            i += 4
            continue
        }

        break
    }

    while (tempDigitsCount < MAX_SAFE_DIGITS) {
        const byte = bytes[i]

        if (isDigit(byte)) {
            if (byte !== ZERO || (state & STATE_NONZERO)) {
                tempMantissa = tempMantissa * 10 + (byte & 0x0F)
                tempDigitsCount++

                numberOfTrailingZeros = byte === ZERO ? numberOfTrailingZeros + 1 : 0

                if ((state & STATE_DECIMAL) === 0) {
                    scale++
                }

                state |= STATE_NONZERO
            }
            else if (state & STATE_DECIMAL) {
                scale--
            }

            i++
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
                exponent = exponent * 10 + (bytes[i] & 0x0F)
                i++
            }

            exponent *= signExp
            scale += exponent
            break
        }

        state |= STATE_END
        break
    }

    if (state & STATE_END) {
        const positiveExponent = Math.max(0, scale)
        const integerDigitsPresent = Math.min(positiveExponent, tempDigitsCount)
        const fractionalDigitsPresent = tempDigitsCount - integerDigitsPresent

        const exponent = scale - integerDigitsPresent - fractionalDigitsPresent
        const fastExponent = Math.abs(exponent)

        const MAX_SAFE_EXPONENT = 308

        if (fastExponent <= MAX_SAFE_EXPONENT) {
            const expScale = POS_POW10[fastExponent]

            if (fractionalDigitsPresent !== 0) {
                tempMantissa /= expScale
            }
            else {
                tempMantissa *= expScale
            }

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
    }

    let mantissa = BigInt(tempMantissa)
    let digitsCount = tempDigitsCount
    tempDigitsCount = 0
    tempMantissa = 0

    const end = bytes.length
    while (i < end - 4) {
        const a = bytes[i]
        const b = bytes[i + 1]
        const c = bytes[i + 2]
        const d = bytes[i + 3]

        const chunk = (a << 0 | b << 8 | c << 16 | d << 24) - 0x30303030
        const tmp = ((chunk + 0x76767676) | chunk) & 0x80808080

        if (tmp === 0) {
            let whole = 0

            if (isLittleEndian) {
                const result =
                    ((chunk & 0x00FF00FF) * 10) +
                    ((chunk >> 8) & 0x00FF00FF)
                whole = ((result & 0xFFFF) * 100) + (result >>> 16)
            }
            else {
                const high =
                    ((chunk >> 24) & 0xFF) * 10 +
                    ((chunk >> 16) & 0xFF)
                const low =
                    ((chunk >> 8) & 0xFF) * 10 +
                    ((chunk & 0xFF))
                whole = high * 100 + low
            }

            tempDigitsCount += 4

            if (tempDigitsCount === 16) {
                const low = conversionU32[0]
                const high = conversionU32[1]
                const newLow = low * 10000 + whole
                const carry = Math.floor(newLow / 0x100000000)
                conversionU32[0] = newLow >>> 0
                conversionU32[1] = high * 10000 + carry

                mantissa = mantissa * POW10[tempDigitsCount] + conversionU64[0]
                tempDigitsCount = 0
            }
            else {
                tempMantissa = tempMantissa * 10000 + whole

                if (tempDigitsCount === 12) {
                    const high = Math.floor(tempMantissa / 0x100000000)
                    const low = tempMantissa >>> 0
                    conversionU32[0] = low
                    conversionU32[1] = high

                    tempMantissa = 0
                }
            }

            digitsCount += 4
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
                const digit = byte & 0x0F

                tempMantissa = tempMantissa * 10 + digit
                tempDigitsCount++

                if (tempDigitsCount >= 15) {
                    const high = Math.floor(tempMantissa / 0x100000000)
                    const low = tempMantissa >>> 0
                    conversionU32[0] = low
                    conversionU32[1] = high
                    mantissa = mantissa * POW10[tempDigitsCount] + conversionU64[0]

                    tempDigitsCount = 0
                    tempMantissa = 0
                }

                numberOfTrailingZeros = byte === ZERO ? numberOfTrailingZeros + 1 : 0

                if ((state & STATE_DECIMAL) === 0) {
                    scale++
                }

                state |= STATE_NONZERO
                digitsCount++
            }
            else if (state & STATE_DECIMAL) {
                scale--
            }

            i++
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
            break
        }

        break
    }

    if (tempDigitsCount > 0) {
        if (tempMantissa > 0) {
            const high = Math.floor(tempMantissa / 0x100000000)
            const low = tempMantissa >>> 0
            conversionU32[0] = low
            conversionU32[1] = high
        }
        mantissa = mantissa * POW10[tempDigitsCount] + conversionU64[0]
    }

    const positiveExponent = Math.max(0, scale)
    const integerDigitsPresent = Math.min(positiveExponent, digitsCount)
    const fractionalDigitsPresent = digitsCount - integerDigitsPresent

    return {
        value: numberToFloatingPointBitsSlow(
            mantissa, digitsCount, scale, positiveExponent,
            integerDigitsPresent, fractionalDigitsPresent, doublePrecisionFormat
        ),
        nextIndex: i
    }
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

const MASK64 = ((1n << 64n) - 1n)
const SHIFT_BIGINTS = new Array(129)
const MASK_BIGINTS = new Array(129)
for (let i = 1; i <= 127; i++) {
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

    let mantissa
    if (shiftAmount >= 0) {
        mantissa = value >> SHIFT_BIGINTS[shiftAmount]
    }
    else {
        mantissa = (value << SHIFT_BIGINTS[shiftAmount + 127]) & MASK64
    }
    const exponent = baseExponent + shiftAmount

    const hasZeroTail = !hasNonZeroFractionalPart && ((value & MASK_BIGINTS[shiftAmount]) === 0n)

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
    }
    else {
        if (normalMantissaShift < 0) {
            mantissa = rightShiftWithRounding64(mantissa, conversionU32, conversionU64, -normalMantissaShift, hasZeroTail)

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

    const maskValue = 2 ** 52 - 1  // 9007199254740991
    const combined = combineInt53(conversionU32[1], conversionU32[0])
    const mantissa52bits = combined % (maskValue + 1)

    const N = 4503599627370496 // 2^52
    const expIdx = Math.min(Math.max(exponent, -1022), 1023) + 1022
    return (1 + mantissa52bits / N) * POW2[expIdx]

    // mantissa = mantissa & format.denormalMantissaMask

    // const N = 4503599627370496 // 2^52
    // const expIdx = Math.min(Math.max(exponent, -1022), 1023) + 1022
    // return (1 + Number(mantissa) / N) * POW2[expIdx]
}

function combineInt53(high21: number, low32: number) {
    high21 = Number(high21) & 0x1FFFFF
    low32 = Number(low32) >>> 0
    return (high21 * 0x100000000) + low32
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

function rightShiftWithRounding64(
    value: bigint,
    conversionU32: Uint32Array,
    conversionU64: BigUint64Array,
    shift: number,
    hasZeroTail: boolean
): bigint {
    if (shift === 0) return 0n

    conversionU64[0] = value

    const low = conversionU32[0]
    const high = conversionU32[1]

    const resultHigh = (high >>> shift) >>> 0
    const highBits = (high & ((1 << shift) - 1)) << (32 - shift)
    const resultLow = ((low >>> shift) | highBits) >>> 0

    const lastBitMask = 1 << (shift - 1)
    const lastBit = (low & lastBitMask) !== 0

    const lowerBitsMask = lastBitMask - 1
    const hasLowerBits = (low & lowerBitsMask) !== 0

    if (lastBit && (hasLowerBits || hasZeroTail || ((resultLow & 1) !== 0))) {
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
