const POW10 = [1n]
for (let i = 1; i <= 308; i++) {
    POW10[i] = POW10[i - 1] * 10n
}

const buffer = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(buffer)
const conversionU64 = new BigUint64Array(buffer)

// export function high64Huge(digits: number[]) {
//     const THRESHOLD = 1n << 64n
//     const MAX_MANTISSA = 1n << 86n
//     const SHIFT_AMOUNT = 22n
//     const MAX_SAFE_CHUNK = 15
//     const MAX_CHUNK_SIZE = 19

//     let i = 0
//     const len = digits.length

//     let exactValue = 0n

//     while (i < len) {
//         const remaining = len - i
//         const chunkSize = Math.min(MAX_CHUNK_SIZE, remaining)

//         let chunkNum = 0
//         for (let j = 0; j < chunkSize; j++) {
//             if (j < MAX_SAFE_CHUNK) {
//                 chunkNum = chunkNum * 10 + digits[i + j]
//             }
//             else if (j === MAX_SAFE_CHUNK) {
//                 const high = Math.floor(chunkNum / 0x100000000)
//                 const low = chunkNum >>> 0
//                 const newLow = low * 10 + digits[i + j]
//                 const carry = Math.floor(newLow / 0x100000000)
//                 conversionU32[0] = newLow >>> 0
//                 conversionU32[1] = high * 10 + carry
//             }
//             else {
//                 const newLow = conversionU32[0] * 10 + digits[i + j]
//                 const carry = Math.floor(newLow / 0x100000000)
//                 conversionU32[0] = newLow >>> 0
//                 conversionU32[1] = conversionU32[1] * 10 + carry
//             }
//         }

//         if (chunkSize <= MAX_SAFE_CHUNK) {
//             const high = Math.floor(chunkNum / 0x100000000)
//             const low = chunkNum >>> 0
//             conversionU32[0] = low
//             conversionU32[1] = high
//         }
//         exactValue = exactValue * POW10[chunkSize] + conversionU64[0]
        
//         i += chunkSize

//         if (exactValue >= THRESHOLD) {
//             let mantissa = exactValue
//             let exponent = 0n

//             while (mantissa >= MAX_MANTISSA) {
//                 mantissa >>= 1n
//                 exponent += 1n
//             }

//             while (i < len) {
//                 const remainChunk = Math.min(8, len - i)
//                 let remainNum = 0
//                 for (let j = 0; j < remainChunk; j++) {
//                     remainNum = remainNum * 10 + digits[i + j]
//                 }

//                 mantissa = mantissa * POW10[remainChunk] + BigInt(remainNum)

//                 while (mantissa >= MAX_MANTISSA) {
//                     mantissa >>= 1n
//                     exponent += 1n
//                 }

//                 i += remainChunk
//             }

//             return {
//                 mantissa: mantissa >> SHIFT_AMOUNT,
//                 exp: exponent
//             }
//         }
//     }

//     return { mantissa: exactValue, exp: 0n }
// }

const BIG_DIGITS = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n]

export function high64Huge(digits: number[]) {
    const THRESHOLD = 1n << 64n
    const MANTISSA_BITS = 86n
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
        mantissa: mantissa >> 22n,
        exp: exponent
    }
}