export function clz(low: number, high: number): number {
    if (high !== 0)
        return Math.clz32(high)
    return 32 + Math.clz32(low)
}

export function shiftLeft(low: number, high: number, bits: number, output: Uint32Array): Uint32Array {
    if (bits === 0) {
        output[0] = low
        output[1] = high
        return output
    }

    if (bits < 32) {
        output[0] = low << bits
        output[1] = (high << bits) | (low >>> (32 - bits))
        return output
    }

    if (bits < 64) {
        output[0] = 0
        output[1] = low << (bits - 32)
        return output
    }

    output[0] = 0
    output[1] = 0
    return output
}

export function shiftRight(low: number, high: number, bits: number, output: Uint32Array): Uint32Array {
    if (bits === 0) {
        output[0] = low
        output[1] = high
        return output
    }

    if (bits < 32) {
        output[0] = (low >>> bits) | (high << (32 - bits))
        output[1] = high >>> bits
        return output
    }

    if (bits < 64) {
        output[0] = high >>> (bits - 32)
        output[1] = 0
        return output
    }

    output[0] = 0
    output[1] = 0
    return output
}

export function isGreaterThan(al: number, ah: number, bl: number, bh: number) {
    if (ah > bh) return true
    if (ah < bh) return false
    return (al >>> 0) > (bl >>> 0)
}

export function isGreaterThanOrEqual(al: number, ah: number, bl: number, bh: number) {
    if (ah > bh) return true
    if (ah < bh) return false
    return (al >>> 0) >= (bl >>> 0)
}

export function isLessThan(al: number, ah: number, bl: number, bh: number) {
    if (ah < bh) return true
    if (ah > bh) return false
    return (al >>> 0) < (bl >>> 0)
}