const POS_POW10 = [1]
const POW10 = [1n]
for (let i = 1; i <= 308; i++) {
    POS_POW10[i] = POS_POW10[i - 1] * 10
    POW10[i] = POW10[i - 1] * 10n
}

const BIG_DIGITS = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n]

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