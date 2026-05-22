import { parseNumberF64, rightShiftWithRounding } from "./src/converters/number"

const str = "1123456789123456789123456789"
const bytes = new TextEncoder().encode(str)
console.log(Number(str), parseNumberF64(bytes, 0))

const digits = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const highhuge = high64Huge(digits)

const exponent = 52n + ((86n - 64n) + highhuge.exp)
const normalMantissaShift = 53n - 64n
const normalExponent = exponent - normalMantissaShift

let mantissa = rightShiftWithRounding(highhuge.mantissa, -normalMantissaShift, false)
mantissa &= ((1n << 52n) - 1n)

const shiftedExponent = BigInt(normalExponent + 1023n) << 52n
const combined = shiftedExponent | mantissa
const buffer = new ArrayBuffer(8)
const conversionU64 = new BigUint64Array(buffer)
const conversionF64 = new Float64Array(buffer)
conversionU64[0] = combined
console.log(conversionF64[0])

function high64Huge(decimalString: number[]) {
    const str = decimalString

    const THRESHOLD = 1n << 64n;
    const MANTISSA_BITS = 86n;
    const MAX_MANTISSA = 1n << MANTISSA_BITS;

    let exact = 0n;
    let mantissa = 0n;
    let exp = 0n;
    let mode = 'exact'; // 'exact' | 'approx'

    for (const ch of str) {
        const d = BigInt(ch)

        if (mode === 'exact') {
            exact = exact * 10n + d
            if (exact >= THRESHOLD) {
                mantissa = exact
                exp = 0n
                mode = 'approx'
                while (mantissa >= MAX_MANTISSA) {
                    mantissa >>= 1n
                    exp += 1n
                }
            }
        } else {
            mantissa = mantissa * 10n;

            if (exp <= 4n) {
                mantissa += d >> exp;
            }

            while (mantissa >= MAX_MANTISSA) {
                mantissa >>= 1n;
                exp += 1n;
            }
        }
    }

    if (mode === 'exact') {
        return {
            mantissa: exact,
            exp: exp
        }
    }

    const mantBits = mantissa.toString(2).length
    if (mantBits <= 64) {
        return {
            mantissa: mantissa << BigInt(64 - mantBits),
            exp: exp
        }
    } else {
        return {
            mantissa: mantissa >> BigInt(mantBits - 64),
            exp: exp
        }
    }
}

// const digits = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9]
// console.log(toNumber64(digits))

// const bytes = digitsToBytes(digits)
// const buffer = new ArrayBuffer(16)
// const u8 = new Uint8Array(buffer)
// u8.set(bytes)
// const u32 = new Uint32Array(u8.buffer)
// const u64 = new BigUint64Array(u8.buffer)

// console.log(u8)
// console.log(u32)
// console.log(u64)
// console.log('\n--------------------------\n')
// console.log(digitsToBits(digits).join(''))
// console.log((1123456789123456789123456789n).toString(2))
// console.log(bitsToBigInt(digitsToBits(digits)))
// console.log(bitsToBigInt(digitsToBits(digits).slice(0, 64)))

function digitsToBytes(digits: number[]) {
    const result: number[] = []

    for (const digit of digits) {
        let carry = digit;
        for (let i = 0; i < result.length; i++) {
            const value = result[i] * 10 + carry
            result[i] = value & 0xFF
            carry = value >> 8
        }
        while (carry > 0) {
            result.push(carry & 0xFF)
            carry >>= 8
        }
    }

    return result.reverse()
}

function bytesToBigInt(bytes: number[] | Uint8Array) {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
        result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
}

function bigintToBytes(bigint: bigint) {
    if (bigint === 0n) return [0];

    const bytes = [];
    let value = bigint;

    while (value > 0n) {
        bytes.unshift(Number(value & 0xFFn));
        value >>= 8n;
    }

    return bytes;
}

function toBigInt(high: bigint, low: bigint) {
    return (high << 64n) | low
}