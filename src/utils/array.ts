export function equals(a: Uint8Array, b: Uint8Array, aI: number, bI: number): boolean {
    const length = Math.min(a.length - aI, b.length - bI)
    if (length <= 0) return true

    let i = 0
    while (i < length) {
        if (a[aI + i] !== b[bI + i])
            return false
        i++
    }

    return true
}
