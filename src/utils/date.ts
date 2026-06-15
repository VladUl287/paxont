import { COLON, DOT, isDigitU8, MINUS, PLUS, T_UPPER, Z } from "./utf8constants";

const nonDigit = (b: number) => !isDigitU8(b)

function expectFourDigits(b: Uint8Array, i: number): number {
    if (i + 4 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[++i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function expectThreeDigits(b: Uint8Array, i: number): number {
    if (i + 3 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function expectTwoDigits(b: Uint8Array, i: number): number {
    if (i + 2 >= b.length || nonDigit(b[i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

export function tryParseISO8601(b: Uint8Array, i: number, r: Date): number {
    const len1 = b.length - 1

    if ((i = expectFourDigits(b, i)) < 0) //YYYY
        return -1

    const YYYY = ((b[i - 4] & 0x0F) * 1000) + ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (i >= len1 || b[i++] !== MINUS) {
        r.setTime(Date.UTC(YYYY))
        return i
    }

    if ((i = expectTwoDigits(b, i)) < 0) //MM
        return -1

    const MM = (((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)) - 1
    if (MM < 0 || MM > 11)
        return -1

    if (i >= len1 || b[i++] !== MINUS) {
        r.setTime(Date.UTC(YYYY, MM))
        return i
    }

    if ((i = expectTwoDigits(b, i)) < 0) //DD
        return -1

    const DD = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (DD < 1 || DD > 31)
        return -1

    if (i >= len1 || b[i++] !== T_UPPER) {
        r.setTime(Date.UTC(YYYY, MM, DD))
        return i
    }

    if ((i = expectTwoDigits(b, i)) < 0 || b[i++] !== COLON || (i = expectTwoDigits(b, i)) < 0) //HH:mm
        return -1

    const HH = ((b[i - 5] & 0x0F) * 10) + (b[i - 4] & 0x0F)
    if (HH < 0 || HH > 23)
        return -1

    const mm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (mm < 0 || mm > 59)
        return -1

    if (i >= len1 || b[i++] !== COLON) {
        r.setTime(Date.UTC(YYYY, MM, DD, HH, mm))
        return i
    }

    if ((i = expectTwoDigits(b, i)) < 0) //ss
        return -1

    const ss = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (ss < 0 || ss > 59)
        return -1

    let sss = 0
    if (i <= len1 && b[i] === DOT) {
        if ((i = expectThreeDigits(b, i + 1)) < 0) //sss
            return -1

        sss = ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
        if (sss < 0 || ss > 999)
            return -1
    }

    if (i < len1 && b[i] === Z) { //Z
        r.setTime(Date.UTC(YYYY, MM, DD, HH, mm, ss, sss))
        return i
    }

    if (i >= len1 && b[i] !== MINUS && b[i] !== PLUS) { //not ±
        r.setFullYear(YYYY)
        r.setMonth(MM)
        r.setDate(DD)
        r.setHours(HH)
        r.setMinutes(mm)
        r.setSeconds(ss)
        r.setMilliseconds(sss)
        return i
    }

    const sign = b[i] === MINUS ? -1 : 1

    if ((i = expectTwoDigits(b, i)) < 0 || b[++i] !== COLON || (i = expectTwoDigits(b, i)) < 0) //HH:mm
        return -1

    const ZHH = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (ZHH < 0 || ZHH > 23)
        return -1

    const zmm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (zmm < 0 || zmm > 59)
        return -1

    r.setTime(Date.UTC(YYYY, MM, DD, HH - (ZHH * sign), mm - (zmm * sign), ss, sss))
    return i
}
