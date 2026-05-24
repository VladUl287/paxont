const registers = new Uint32Array(3)

export function getHigh64BitsFrom96(digits: Uint8Array | number[], base = 10) {
    const TWO_POW_32 = 0x100000000

    for (let i = 0; i < digits.length; i++) {
        let carry = digits[i]

        let product = registers[0] * base + carry
        registers[0] = product & 0xFFFFFFFF
        carry = Math.floor(product / TWO_POW_32)
        // carry = (product / 0x100000000) | 0

        product = registers[1] * base + carry
        registers[1] = product & 0xFFFFFFFF
        carry = Math.floor(product / TWO_POW_32)
        // carry = (product / 0x100000000) | 0

        product = registers[2] * base + carry
        registers[2] = product & 0xFFFFFFFF
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
