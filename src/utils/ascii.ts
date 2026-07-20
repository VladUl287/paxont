export const isDigit = (b: number) => b >= 48 && b <= 57
export const isDigitUnsafe = (b: number) => ((b - 48) >>> 0) <= 9