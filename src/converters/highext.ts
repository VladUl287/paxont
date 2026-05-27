const POS_POW10 = [1]
const POW10 = [1n]
for (let i = 1; i <= 308; i++) {
    POS_POW10[i] = POS_POW10[i - 1] * 10
    POW10[i] = POW10[i - 1] * 10n
}

const BIG_DIGITS = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n]

const buffer = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(buffer)
const conversionU64 = new BigUint64Array(buffer)
const conversionF64 = new Float64Array(buffer)

export function high64Huge1(digits: number[]) {
    const THRESHOLD = 1n << 64n
    const MAX_MANTISSA = 1n << 96n
    const STATE_EXACT = 0b01
    const STATE_APPROX = 0b10
    const CHUNK_SIZE = 15  // Max safe digits in JS Number (15 digits: 10^15 < 2^53)

    let exact = 0n
    let mantissa = 0n
    let exponent = 0
    let mode = STATE_EXACT

    let i = 0
    const n = digits.length

    while (i < n) {
        const chunkEnd = Math.min(i + CHUNK_SIZE, n)

        let chunkValue = 0
        for (let j = i; j < chunkEnd; j++) {
            chunkValue = chunkValue * 10 + digits[j]
        }

        const chunkBigInt = BigInt(chunkValue)
        const chunkLength = chunkEnd - i

        if (mode === STATE_EXACT) {
            exact = exact * POW10[chunkLength] + chunkBigInt

            if (exact >= THRESHOLD) {
                mantissa = exact
                exponent = 0
                mode = STATE_APPROX
                while (mantissa >= MAX_MANTISSA) {
                    mantissa >>= 1n
                    exponent++
                }
            }
        } else {
            const shiftFactor = POW10[chunkLength]
            mantissa = mantissa * shiftFactor

            if (exponent <= 4) {
                mantissa += chunkBigInt >> BigInt(exponent)
            }

            while (mantissa >= MAX_MANTISSA) {
                mantissa >>= 1n
                exponent++
            }
        }

        i = chunkEnd
    }

    if (mode === STATE_EXACT) {
        return {
            mantissa: exact,
            exp: 0n
        }
    }

    return {
        mantissa: mantissa >> 32n,
        exp: exponent
    }
}

export function high64Huge(digits: number[]) {
    const THRESHOLD = 1n << 64n
    const MANTISSA_BITS = 96n
    const MAX_MANTISSA = 1n << MANTISSA_BITS

    let exact = 0n
    let mantissa = 0n
    let exponent = 0n

    const STATE_EXACT = 0b01
    const STATE_APPROX = 0b10
    let mode: 0b01 | 0b10 = STATE_EXACT

    for (const digit of digits) {
        const d = BIG_DIGITS[digit]

        if (mode === STATE_EXACT) {
            exact = exact * 10n + d

            if (exact >= THRESHOLD) {
                mantissa = exact
                exponent = 0n
                mode = STATE_APPROX
                while (mantissa >= MAX_MANTISSA) {
                    mantissa >>= 1n
                    exponent += 1n
                }
            }
        } else {
            mantissa = mantissa * 10n

            if (exponent <= 4n) {
                mantissa += d >> exponent
            }

            while (mantissa >= MAX_MANTISSA) {
                mantissa >>= 1n
                exponent += 1n
            }
        }
    }

    if (mode === STATE_EXACT) {
        return {
            mantissa: exact,
            exp: exponent
        }
    }

    return {
        mantissa: mantissa >> 32n,
        exp: exponent
    }
}