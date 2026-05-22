// Pre-compute powers of 10 as BigInt
const POW10_BIGINT = Array.from({ length: 16 }, (_, i) => 10n ** BigInt(i))

// Pre-compute powers of 10 as numbers for chunking
const POW10_NUM = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000,
    1000000000, 10000000000, 100000000000, 1000000000000,
    10000000000000, 100000000000000, 1000000000000000]

const BIG_DIGITS = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n]

export function high64Huge(digits: number[]) {
    const THRESHOLD = 1n << 64n
    const MAX_MANTISSA = 1n << 86n
    const SHIFT_AMOUNT = 22n
    const MAX_CHUNK_SIZE = 15

    let i = 0
    const len = digits.length

    let exactValue = 0n

    while (i < len) {
        const remaining = len - i
        const chunkSize = Math.min(MAX_CHUNK_SIZE, remaining)

        let chunkNum = 0
        for (let j = 0; j < chunkSize; j++) {
            chunkNum = chunkNum * 10 + digits[i + j]
        }

        exactValue = exactValue * POW10_BIGINT[chunkSize] + BigInt(chunkNum)
        i += chunkSize

        if (exactValue >= THRESHOLD) {
            let mantissa = exactValue
            let exponent = 0n

            while (mantissa >= MAX_MANTISSA) {
                mantissa >>= 1n
                exponent += 1n
            }

            while (i < len) {
                const remainChunk = Math.min(8, len - i)
                let remainNum = 0
                for (let j = 0; j < remainChunk; j++) {
                    remainNum = remainNum * 10 + digits[i + j]
                }

                mantissa = mantissa * POW10_BIGINT[remainChunk] + BigInt(remainNum)

                while (mantissa >= MAX_MANTISSA) {
                    mantissa >>= 1n
                    exponent += 1n
                }

                i += remainChunk
            }

            return {
                mantissa: mantissa >> SHIFT_AMOUNT,
                exp: exponent
            }
        }
    }

    return { mantissa: exactValue, exp: 0n }
}

// export function high64Huge(digits: number[]) {
//     const THRESHOLD = 1n << 64n
//     const MANTISSA_BITS = 86n
//     const MAX_MANTISSA = 1n << MANTISSA_BITS

//     let exact = 0n
//     let mantissa = 0n
//     let exponent = 0n

//     const STATE_EXACT = 0b01
//     const STATE_APPROX = 0b10
//     let mode: 0b01 | 0b10 = STATE_EXACT

//     for (const digit of digits) {
//         const d = BigDigits[digit]

//         if (mode === STATE_EXACT) {
//             exact = exact * 10n + d

//             if (exact >= THRESHOLD) {
//                 mantissa = exact
//                 exponent = 0n
//                 mode = STATE_APPROX
//                 while (mantissa >= MAX_MANTISSA) {
//                     mantissa >>= 1n
//                     exponent += 1n
//                 }
//             }
//         } else {
//             mantissa = mantissa * 10n

//             if (exponent <= 4n) {
//                 mantissa += d >> exponent
//             }

//             while (mantissa >= MAX_MANTISSA) {
//                 mantissa >>= 1n
//                 exponent += 1n
//             }
//         }
//     }

//     if (mode === STATE_EXACT) {
//         return {
//             mantissa: exact,
//             exp: exponent
//         }
//     }

//     return {
//         mantissa: mantissa >> 22n,
//         exp: exponent
//     }
// }