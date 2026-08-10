export type FloatFormat = {
    readonly normalMantissaBits: number
    readonly denormalMantissaBits: number
    readonly exponentBias: number
    readonly maxBinaryExponent: number
    readonly minBinaryExponent: number
    readonly exponentBits: number
    readonly normalMantissaMask: bigint
    readonly denormalMantissaMask: bigint
    readonly zeroBits: number
    readonly overflowDecimalExponent: number,
    readonly maxExponentFastPath: number,
    readonly minSafeExponent: number,
    readonly maxSafeExponent: number,
    readonly minExponentRoundToEven: number,
    readonly maxExponentRoundToEven: number,
    readonly infinityExponent: number
}

export const float64: FloatFormat = Object.freeze({
    normalMantissaBits: 53,
    denormalMantissaBits: 52,
    exponentBias: 1023,
    maxBinaryExponent: 1023,
    minBinaryExponent: -1022,
    exponentBits: 11,
    normalMantissaMask: (1n << 53n) - 1n,
    denormalMantissaMask: (1n << 52n) - 1n,
    zeroBits: 0,
    overflowDecimalExponent: 324,
    maxExponentFastPath: 22,
    minSafeExponent: -342,
    maxSafeExponent: 308,
    minExponentRoundToEven: -27,
    maxExponentRoundToEven: 55,
    infinityExponent: 2047
})
