import { COLON, DOT, isDigit, isDigitU8, MINUS, PLUS, T, Z } from "./utf8constants";

export function isISO8601FromString(d: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:[+-]\d{2}:\d{2}|Z)$/
    return isoRegex.test(d)
}

const notDigit = (b: number) => !isDigitU8(b)

function yearIndex(b: Uint8Array, i: number): number {
    if (i + 4 >= b.length || notDigit(b[i]) || notDigit(b[++i]) || notDigit(b[++i]) || notDigit(b[++i])) //YYYY
        return -1
    return ++i
}

export function isISO8601(b: Uint8Array, i: number): boolean {
    const len = b.length
    const len1 = b.length - 1

    if ((i = yearIndex(b, i)) < 0)
        return false

    if (i >= len1 || b[++i] !== MINUS)
        return true

    if (!(i + 2 < len && isDigitU8(b[++i]) && isDigitU8(b[++i]))) //MM
        return false

    if (i >= len1 || b[++i] !== MINUS)
        return true

    if (!(i + 2 < len && isDigitU8(b[++i]) && isDigitU8(b[++i]))) //DD
        return false

    if (i >= len1 || b[++i] !== T)
        return true

    if (i + 5 >= len) //HH:mm
        return false

    if (!(isDigitU8(b[++i]) && isDigitU8(b[++i]) && b[++i] === COLON && isDigitU8(b[++i]) && isDigitU8(b[++i])))//HH:mm
        return false

    if (i >= len1 || b[++i] !== COLON)
        return true

    if (!(i + 2 < len && isDigitU8(b[++i]) && isDigitU8(b[++i]))) //ss
        return false

    if (i >= len1 || b[++i] !== DOT) //ss.sss
        return true

    if (!(isDigitU8(b[++i]) && isDigitU8(b[++i]) && isDigitU8(b[++i]))) //sss
        return false

    if (i >= len1 || b[++i] === Z) //Z
        return true

    if (i >= len1 || (b[i] !== MINUS && b[i] !== PLUS)) //±
        return true

    if (!(isDigitU8(b[++i]) && isDigitU8(b[++i]) && b[++i] === COLON && isDigitU8(b[++i]) && isDigitU8(b[++i]))) //HH:mm
        return false

    return true
}