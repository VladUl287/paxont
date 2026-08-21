export type FloatFormat = {
    readonly denormalMantissaBits: number
    readonly maxBinaryExponent: number
    readonly maxExponentFastPath: number,
    readonly minSafeExponent: number,
    readonly maxSafeExponent: number,
    readonly minExponentRoundToEven: number,
    readonly maxExponentRoundToEven: number,
    readonly infinityExponent: number
}

export const float64: FloatFormat = Object.freeze({
    denormalMantissaBits: 52,
    maxBinaryExponent: 1023,
    maxExponentFastPath: 22,
    minSafeExponent: -342,
    maxSafeExponent: 308,
    minExponentRoundToEven: -27,
    maxExponentRoundToEven: 55,
    infinityExponent: 2047
})
