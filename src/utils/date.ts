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
    if (i + 3 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function twoDigits(b: Uint8Array, i: number): number {
    if (i + 2 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function combine(b: Uint8Array, i: number, count: number): number {
    let result = 0
    for (let j = i; j < i + count; j++) {
        result = result * 10 + (b[j] & 0x0F)
    }
    return result
}

export function tryParseISO8601(b: Uint8Array, i: number, result: { value: Date, nextIndex: number }): boolean {
    const len1 = b.length - 1

    if ((i = fourDigits(b, i)) < 0) //YYYY
        return false

    const YYYY = ((b[i - 4] & 0x0F) * 1000) + ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (i >= len1 || b[i++] !== MINUS) {
        result.value = new Date(Date.UTC(YYYY))
        result.nextIndex = i
        return true
    }

    if ((i = twoDigits(b, i)) < 0) //MM
        return false

    const MM = (((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)) - 1
    if (MM < 0 || MM > 11)
        return false

    if (i >= len1 || b[i++] !== MINUS) {
        result.value = new Date(Date.UTC(YYYY, MM))
        result.nextIndex = i
        return true
    }

    if ((i = twoDigits(b, i)) < 0) //DD
        return false

    const DD = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (DD < 1 || DD > 31)
        return false

    if (i >= len1 || b[i++] !== T) {
        result.value = new Date(Date.UTC(YYYY, MM, DD))
        result.nextIndex = i
        return true
    }

    if ((i = twoDigits(b, i)) < 0 || b[i++] !== COLON || (i = twoDigits(b, i)) < 0) //HH:mm
        return false

    const HH = ((b[i - 5] & 0x0F) * 10) + (b[i - 4] & 0x0F)
    if (HH < 0 || HH > 23)
        return false

    const mm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (mm < 0 || mm > 59)
        return false

    if (i >= len1 || b[i++] !== COLON) {
        result.value = new Date(Date.UTC(YYYY, MM, DD, HH, mm))
        result.nextIndex = i
        return true
    }

    if ((i = twoDigits(b, i)) < 0) //ss
        return false

    const ss = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (ss < 0 || ss > 59)
        return false

    let sss = 0
    if (i <= len1 && b[i] === DOT) {
        if ((i = threeDigits(b, i + 1)) < 0) //sss
            return false

        sss = ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
        if (sss < 0 || ss > 999)
            return false
    }

    if (i < len1 && b[i] === Z) { //Z
        result.value = new Date(Date.UTC(YYYY, MM, DD, HH, mm, ss, sss))
        result.nextIndex = ++i
        return true
    }

    if (i >= len1 && b[i] !== MINUS && b[i] !== PLUS) { //not ±
        result.value = new Date(YYYY, MM, DD, HH, mm, ss, sss)
        result.nextIndex = i
        return true
    }

    const sign = b[i] === MINUS ? -1 : 1

    if ((i = twoDigits(b, i)) < 0 || b[++i] !== COLON || (i = twoDigits(b, i)) < 0) //HH:mm
        return false

    const ZHH = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (ZHH < 0 || ZHH > 23)
        return false

    const zmm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (zmm < 0 || zmm > 59)
        return false

    result.value = new Date(Date.UTC(YYYY, MM, DD, HH - (ZHH * sign), mm - (zmm * sign), ss, sss))
    result.nextIndex = ++i
    return true
}
