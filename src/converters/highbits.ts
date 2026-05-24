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

export function getHigh64BitsFrom961(digits: Uint8Array | number[], base = 10) {
    let low = 0      // bits 0-31
    let mid = 0      // bits 32-63
    let high = 0     // bits 64-95

    const TWO_POW_32 = 0x100000000

    for (let i = 0; i < digits.length; i++) {
        let carry = digits[i]

        // Multiply low 32 bits
        let product = low * base + carry
        low = product % TWO_POW_32
        carry = Math.floor(product / TWO_POW_32)

        // Multiply middle 32 bits
        product = mid * base + carry
        mid = product % TWO_POW_32
        carry = Math.floor(product / TWO_POW_32)

        // Multiply high 32 bits
        product = high * base + carry
        high = product % TWO_POW_32
    }

    return {
        high64: {
            high: high,  // bits 64-95
            low: mid     // bits 32-63
        },
        low32: low,      // bits 0-31 (optional)
        asNumber: BigInt(high) * BigInt(TWO_POW_32) + BigInt(mid)  // Safe for 53-bit numbers
    };
}
