export function toNumber64(digits: number[] | Uint8Array) {
    const bits = digitsToBitsBase10e91(digits)
    // const bits = digitsToBits1(digits)
    // return bits as any
    return {
        bits: bits,
        digits: bitsToBigInt(bits.subarray(0, 64))
    }
}

export function bitsToBigInt(bits: Uint8Array) {
    let result = 0n

    for (let i = 0; i < bits.length; i++) {
        result = (result << 1n) | BigInt(bits[i])
    }

    return result
}

export function digitsToBits(digits: number[] | Uint8Array) {
    if (!digits.length) return new Uint8Array([0])

    const numStr = digits.join('')

    let decimalStr = numStr
    let bits = []

    while (decimalStr !== '0') {
        let remainder = 0
        let quotient = ''

        for (let i = 0; i < decimalStr.length; i++) {
            const currentDigit = parseInt(decimalStr[i])
            const currentNumber = remainder * 10 + currentDigit
            const quotientDigit = Math.floor(currentNumber / 2)
            remainder = currentNumber % 2

            if (quotient.length > 0 || quotientDigit > 0) {
                quotient += quotientDigit
            }
        }

        bits.unshift(remainder)

        decimalStr = quotient.length ? quotient : '0'
    }

    return new Uint8Array(bits)
}

const chunks = new Float64Array(51)
export function digitsToBitsBase10e91(digits: number[] | Uint8Array): Uint8Array {
    const CHUNK_SIZE = 15
    const BASE: number = 1_000_000_000_000_000

    let chunksCount = Math.floor(digits.length / CHUNK_SIZE)
    for (let i = digits.length; i > 0; i -= CHUNK_SIZE) {
        let chunk = 0
        const start = Math.max(0, i - CHUNK_SIZE)
        for (let j = start; j < i; j++) {
            chunk = chunk * 10 + digits[j]
        }
        chunks[chunksCount] = chunk
        chunksCount--
    }

    chunksCount = Math.floor(digits.length / CHUNK_SIZE) + 1

    let bitPos = bits.length - 1

    let j = 0
    while (j < chunksCount || chunks[j] > 0) {
        let remainder = 0

        for (let i = j; i < chunksCount; i++) {
            const current: number = remainder * BASE + chunks[i]
            chunks[i] = Math.floor(current / 2)
            remainder = current & 1
        }

        while (j < chunksCount && chunks[j] === 0) {
            j++
        }

        bits[bitPos--] = remainder
    }

    return bits.subarray(bitPos + 1, bits.length)
}

export function digitsToBitsBase10e9(digits: number[] | Uint8Array): Uint8Array {
    const CHUNK_SIZE = 15
    const BASE: number = 1_000_000_000_000_000

    const chunks = new Array()
    for (let i = digits.length; i > 0; i -= CHUNK_SIZE) {
        let chunk = 0
        const start = Math.max(0, i - CHUNK_SIZE)
        for (let j = start; j < i; j++) {
            chunk = chunk * 10 + digits[j]
        }
        chunks.push(chunk)
    }
    chunks.reverse()

    let bitPos = bits.length - 1

    while (chunks.length > 1 || chunks[0] > 0) {
        let remainder = 0
        for (let i = 0; i < chunks.length; i++) {
            const current: number = remainder * BASE + chunks[i]
            chunks[i] = Math.floor(current / 2)
            remainder = current & 1
        }

        while (chunks.length > 0 && chunks[0] === 0) {
            chunks.shift()
        }

        bits[bitPos--] = remainder
    }

    return bits.subarray(bitPos + 1, bits.length)
}

const bits = new Uint8Array(2048)
export function digitsToBits1(digits: number[] | Uint8Array): Uint8Array {
    const maxBits = Math.ceil((digits.length) * 3.3219280948873626) + 1
    let bitPos = maxBits - 1
    let len = digits.length
    let j = 0

    while (j < len) {
        let remainder = 0

        for (let i = j; i < len; i++) {
            const current = remainder * 10 + digits[i]
            digits[i] = current >> 1
            remainder = current & 1
        }

        while (j < len && digits[j] === 0) {
            j++
        }

        bits[bitPos--] = remainder
    }

    return bits.subarray(bitPos + 1, maxBits)
}

function combine64(high32: number, low32: number) {
    return (BigInt(high32) << 32n) | BigInt(low32 >>> 0)
}