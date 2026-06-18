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

export function tryParseISO8601(b: Uint8Array, i: number, r: { value: Date, nextIndex: number }): boolean {
    const len1 = b.length - 1

    if ((i = expectFourDigits(b, i)) < 0) //YYYY
        return false

    const YYYY = ((b[i - 4] & 0x0F) * 1000) + ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (i >= len1 || b[i++] !== MINUS) {
        r.value = new Date(YYYY, 0)
        r.nextIndex = i
        return true
    }

    if ((i = expectTwoDigits(b, i)) < 0) //MM
        return false

    const MM = (((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)) - 1
    if (MM < 0 || MM > 11)
        return false

    if (i >= len1 || b[i++] !== MINUS) {
        r.value = new Date(YYYY, MM)
        r.nextIndex = i
        return true
    }

    if ((i = expectTwoDigits(b, i)) < 0) //DD
        return false

    const DD = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (DD < 1 || DD > 31)
        return false

    if (i >= len1 || b[i++] !== T_UPPER) {
        r.value = new Date(YYYY, MM, DD)
        r.nextIndex = i
        return true
    }

    if ((i = expectTwoDigits(b, i)) < 0 || b[i++] !== COLON || (i = expectTwoDigits(b, i)) < 0) //HH:mm
        return false

    const HH = ((b[i - 5] & 0x0F) * 10) + (b[i - 4] & 0x0F)
    if (HH < 0 || HH > 23)
        return false

    const mm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (mm < 0 || mm > 59)
        return false

    if (i >= len1 || b[i++] !== COLON) {
        r.value = new Date(YYYY, MM, DD, HH, mm)
        r.nextIndex = i
        return true
    }

    if ((i = expectTwoDigits(b, i)) < 0) //ss
        return false

    const ss = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (ss < 0 || ss > 59)
        return false

    let sss = 0
    if (i <= len1 && b[i] === DOT) {
        if ((i = expectThreeDigits(b, i + 1)) < 0) //sss
            return false

        sss = ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
        if (sss < 0 || ss > 999)
            return false
    }

    if (i < len1 && b[i] === Z) { //Z
        r.value = new Date(utc(YYYY, MM, DD, HH, mm, ss, sss))
        r.nextIndex = i
        return true
    }

    if (i >= len1 && b[i] !== MINUS && b[i] !== PLUS) { //not ±
        r.value = new Date(YYYY, MM, DD, HH, mm, ss, sss)
        r.nextIndex = i
        return true
    }

    const sign = b[i] === MINUS ? -1 : 1

    if ((i = expectTwoDigits(b, i)) < 0 || b[++i] !== COLON || (i = expectTwoDigits(b, i)) < 0) //HH:mm
        return false

    const ZHH = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (ZHH < 0 || ZHH > 23)
        return false

    const zmm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (zmm < 0 || zmm > 59)
        return false

    r.value = new Date(utc(YYYY, MM, DD, HH - (ZHH * sign), mm - (zmm * sign), ss, sss))
    r.nextIndex = i
    return true
}

const months = new Uint16Array([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334])
const monthsLeap = new Uint16Array([0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])

const MAX_YEAR = 4096
const MIN_YEAR = 0

const daysYears = new Uint32Array(MAX_YEAR)
for (let y = 1970; y < MAX_YEAR; y++) {
    const days = isLeap(y) ? 366 : 365
    daysYears[y] = days + daysYears[y - 1]
}

const daysYearsBefore = new Uint32Array(1970)
for (let y = 1969; y >= 0; y--) {
    const days = isLeap(y) ? 366 : 365
    daysYearsBefore[y] = days + (daysYearsBefore[y + 1] || 0)
}

function utc(year: number, month: number, day = 1, hours = 0, minutes = 0, seconds = 0, ms = 0) {
    if (year < MIN_YEAR || year > MAX_YEAR)
        return Date.UTC(year, month, day, hours, minutes, seconds, ms)

    const leap = isLeap(year)

    if (year < 1970) {
        const days = -daysYearsBefore[year] + (leap ? monthsLeap[month] : months[month]) + (day - 1)
        return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
    }

    const days = daysYears[year - 1] + (leap ? monthsLeap[month] : months[month]) + (day - 1)
    return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
}

function isLeap(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
}
