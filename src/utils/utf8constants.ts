export const TAB = 9                // \t
export const NEW_LINE = 10          // \n
export const CARRIAGE_RETURN = 13   // \r
export const SPACE = 32             //
export const DOUBLE_QUOTE = 34      // "
export const COMMA = 44             // ,
export const COLON = 58             // :
export const SQUARE_OPEN = 91       // [
export const SQUARE_CLOSE = 93      // ]
export const CURLY_OPEN = 123       // {
export const CURLY_CLOSE = 125      // }
export const ZERO = 48
export const DOT = 46
export const PLUS = 43
export const MINUS = 45
export const T = 116
export const R = 114
export const U = 117
export const E = 101
export const E_UPPER = 69
export const F = 102
export const A = 97
export const L = 108
export const S = 115
export const Y = 89

export const isDigit = (b: number) => b >= 48 && b <= 57
export const isDigitU8 = (b: number) => ((b - 48) >>> 0) <= 9