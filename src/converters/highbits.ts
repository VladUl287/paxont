const buffer96 = new ArrayBuffer(16)
const registers96_U32 = new Uint32Array(buffer96)
const registers96_U64 = new BigUint64Array(buffer96)

export function getHigh64BitsFrom96(digits: Uint8Array | number[], length: number, base = 10) {
    const CHUNK_SIZE = 6
    const CHUNK_MUL = Math.pow(base, CHUNK_SIZE)

    const UINT32_MAX = 0xFFFFFFFF

    let i = 0
    for (; i < length - CHUNK_SIZE; i += CHUNK_SIZE) {
        let carry =
            digits[i] * 100000 +
            digits[i + 1] * 10000 +
            digits[i + 2] * 1000 +
            digits[i + 3] * 100 +
            digits[i + 4] * 10 +
            digits[i + 5]

        let product = registers96_U32[0] * CHUNK_MUL + carry
        registers96_U32[0] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers96_U32[1] * CHUNK_MUL + carry
        registers96_U32[1] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers96_U32[2] * CHUNK_MUL + carry
        registers96_U32[2] = product & UINT32_MAX
    }

    for (; i < length; i++) {
        let carry = digits[i]

        let product = registers96_U32[0] * base + carry
        registers96_U32[0] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers96_U32[1] * base + carry
        registers96_U32[1] = product & UINT32_MAX
        carry = (product / 0x100000000) | 0

        product = registers96_U32[2] * base + carry
        registers96_U32[2] = product & UINT32_MAX
    }

    return registers96_U32
}

const registers = new Uint32Array(128)
export function getHigh64Bits(digits: Uint8Array | number[], base = 10) {
    const CHUNK_SIZE = 6
    const CHUNK_MUL = Math.pow(base, CHUNK_SIZE)

    const UINT32_MAX = 0xFFFFFFFF
    const TWO_POW_32 = 0x100000000

    let i = 0
    let count = Math.max(2, Math.ceil(digits.length * Math.log2(10) / 32) + 1)

    for (; i < digits.length - CHUNK_SIZE; i += CHUNK_SIZE) {
        let carry =
            digits[i] * 100000 +
            digits[i + 1] * 10000 +
            digits[i + 2] * 1000 +
            digits[i + 3] * 100 +
            digits[i + 4] * 10 +
            digits[i + 5]

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

