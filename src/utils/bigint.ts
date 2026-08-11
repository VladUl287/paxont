export function splitTo64(value: bigint): { high: number, low: number } {
    return {
        low: Number(value & 0xFFFFFFFFn),
        high: Number((value >> 32n) & 0xFFFFFFFFn)
    }
}