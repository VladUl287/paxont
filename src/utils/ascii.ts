export const isDigit = (b: number) => b >= 48 && b <= 57
export const isDigitU = (b: number) => ((b - 48) >>> 0) <= 9