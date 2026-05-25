const registers = new Uint32Array(3)

export function getHigh64BitsFrom96(digits: Uint8Array | number[], base = 10) {
    const CHUNK_SIZE = 5
    const CHUNK_MUL = Math.pow(base, CHUNK_SIZE)

    const UINT32_MAX = 0xFFFFFFFF

    let i = 0
    for (; i < digits.length - CHUNK_SIZE; i += CHUNK_SIZE) {
        const a = digits[i]
        const b = digits[i + 1]
        const c = digits[i + 2]
        const d = digits[i + 3]
        const e = digits[i + 4]

        let carry = ((((a * 10) + b) * 10 + c) * 10 + d) * 10 + e

        let product = registers[0] * CHUNK_MUL + carry
        registers[0] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers[1] * CHUNK_MUL + carry
        registers[1] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers[2] * CHUNK_MUL + carry
        registers[2] = product & UINT32_MAX
    }

    for (; i < digits.length; i++) {
        let carry = digits[i]

        let product = registers[0] * base + carry
        registers[0] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers[1] * base + carry
        registers[1] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers[2] * base + carry
        registers[2] = product & UINT32_MAX
    }

    return registers
}

