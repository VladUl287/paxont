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

export function tryParseISO8601(b: Uint8Array, i: number): Date | number {
    const len1 = b.length - 1

    if ((i = fourDigits(b, i)) < 0) //YYYY
        return -1

    const YYYY = (b[i - 3] * 10) + (b[i - 2] * 10) + (b[i - 1] * 10) + (b[i])
    if (i >= len1 || b[++i] !== MINUS)
        return new Date(Date.UTC(YYYY))

    if ((i = twoDigits(b, i)) < 0) //MM
        return -1

    const MM = ((b[i - 1] * 10) + b[i]) - 1
    if (MM < 0 || MM > 11)
        return -1

    if (i >= len1 || b[++i] !== MINUS)
        return new Date(Date.UTC(YYYY, MM))

    if ((i = twoDigits(b, i)) < 0) //DD
        return -1

    const DD = (b[i - 1] * 10) + b[i]
    if (DD < 1 || DD > 31)
        return -1

    if (i >= len1 || b[++i] !== T)
        return new Date(Date.UTC(YYYY, MM, DD))

    if ((i = twoDigits(b, i)) < 0 || b[++i] !== COLON || (i = twoDigits(b, i)) < 0) //HH:mm
        return -1

    const HH = (b[i - 1] * 10) + b[i]
    if (HH < 0 || HH > 23)
        return -1

    const mm = (b[i - 1] * 10) + b[i]
    if (mm < 0 || mm > 59)
        return -1

    if (i >= len1 || b[++i] !== COLON)
        return new Date(Date.UTC(YYYY, MM, DD, HH, mm))

    if ((i = twoDigits(b, i)) < 0) //ss
        return -1

    const ss = (b[i - 1] * 10) + b[i]
    if (ss < 0 || ss > 59)
        return -1

    if (i >= len1 || b[++i] !== DOT) //ss.sss
        return new Date(Date.UTC(YYYY, MM, DD, HH, mm, ss))

    if ((i = threeDigits(b, i)) < 0) //sss
        return -1

    const sss = (b[i - 2] * 10) + (b[i - 1] * 10) + b[i]
    if (sss < 0 || ss > 999)
        return -1

    if (i >= len1 || b[++i] === Z || (b[i] !== MINUS && b[i] !== PLUS)) //Z and not ±
        return new Date(Date.UTC(YYYY, MM, DD, HH, mm, ss, sss))

    const sign = b[i] === MINUS ? -1 : 1

    if ((i = twoDigits(b, i)) < 0 || b[++i] !== COLON || (i = twoDigits(b, i)) < 0) //HH:mm
        return -1

    const ZHH = ((b[i - 1] * 10) + b[i])
    if (ZHH < 0 || ZHH > 23)
        return -1

    const zmm = ((b[i - 1] * 10) + b[i])
    if (zmm < 0 || zmm > 59)
        return -1

    return new Date(Date.UTC(YYYY, MM, DD, HH - (ZHH * sign), mm - (zmm * sign), ss, sss))
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