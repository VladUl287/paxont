const registers = new Uint32Array(128)

export function getHigh64BitsFrom96(digits: Uint8Array | number[], base = 10) {
    const CHUNK_SIZE = 5
    const CHUNK_MUL = Math.pow(base, CHUNK_SIZE)
    const UINT32_MAX = 0xFFFFFFFF
    const TWO_POW_32 = 0x100000000

    let i = 0
    let count = Math.max(2, Math.ceil(digits.length * Math.log2(10) / 32) + 1)

    for (; i < digits.length - CHUNK_SIZE; i += CHUNK_SIZE) {
        const a = digits[i]
        const b = digits[i + 1]
        const c = digits[i + 2]
        const d = digits[i + 3]
        const e = digits[i + 4]

        let carry = ((((a * 10) + b) * 10 + c) * 10 + d) * 10 + e

        for (let i = 0; i < count; i++) {
            const product = registers[i] * CHUNK_MUL + carry
            registers[i] = product & UINT32_MAX
            carry = (product / TWO_POW_32) | 0
        }

        if (carry > 0) {
            registers[count] = carry
            count++
        }
    }

    for (; i < digits.length; i++) {
        let carry = digits[i]

        for (let i = 0; i < count; i++) {
            const product = registers[i] * 10 + carry
            registers[i] = product & UINT32_MAX
            carry = (product / TWO_POW_32) | 0
        }

        if (carry > 0) {
            registers[count] = carry
            count++
        }
    }

    return registers
}

