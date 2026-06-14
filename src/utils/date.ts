import { COLON, DOT, isDigit, isDigitU8, MINUS, PLUS, T, Z } from "./utf8constants";

export function isISO8601FromString(d: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:[+-]\d{2}:\d{2}|Z)$/
    return isoRegex.test(d)
}

const nonDigit = (b: number) => !isDigitU8(b)

function fourDigits(b: Uint8Array, i: number): number {
    if (i + 4 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[++i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function threeDigits(b: Uint8Array, i: number): number {
    if (i + 3 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[i]))
        return -1
    return ++i
}

function twoDigits(b: Uint8Array, i: number): number {
    if (i + 2 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

export function isISO8601(b: Uint8Array, i: number): number {
    const len = b.length
    const len1 = b.length - 1

    if ((i = fourDigits(b, i)) < 0)
        return -1

    if (i >= len1 || b[++i] !== MINUS)
        return i

    if ((i = twoDigits(b, i)) < 0) //MM
        return -1

    if (i >= len1 || b[++i] !== MINUS)
        return i

    if ((i = twoDigits(b, i)) < 0) //DD
        return -1

    if (i >= len1 || b[++i] !== T)
        return i

    if ((i = twoDigits(b, i)) < 0 || b[++i] !== COLON || (i = twoDigits(b, i)) < 0) //HH:mm
        return -1

    if (i >= len1 || b[++i] !== COLON)
        return i

    if ((i = twoDigits(b, i)) < 0) //ss
        return -1

    if (i >= len1 || b[++i] !== DOT) //ss.sss
        return i

    if ((i = threeDigits(b, i)) < 0) //sss
        return -1

    if (i >= len1 || b[++i] === Z || (b[i] !== MINUS && b[i] !== PLUS)) //Z and not ±
        return i

    if ((i = twoDigits(b, i)) < 0 || b[++i] !== COLON || (i = twoDigits(b, i)) < 0) //HH:mm
        return -1

    return i
}