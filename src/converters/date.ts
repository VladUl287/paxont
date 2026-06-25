import { ConvertCtx, PrimitiveMeta } from "../metadata/types"
import { JsonOptions } from "../options"
import { utc } from "../utils/date"
import { COLON, DOT, DOUBLE_QUOTE, isDigitUnsafe, MINUS, PLUS, T_UPPER, Z } from "../utils/utf8constants"
import { ReadResult } from "../utils/types"

export function toDate(ctx: ConvertCtx, _m: PrimitiveMeta<Date>, i: number, _d: number): ReadResult<Date> {
    const b = ctx.bytes
    const len = b.length

    if (i < len) {
        if (b[i] === DOUBLE_QUOTE)
            return fromString(b, i + 1, ctx.options)

        if (isDigitUnsafe(b[i]))
            return fromTimestamp(b, i)
    }

    throw new Error(`Invalid date value '${b[i]}' at index ${i}`)
}

function fromString(b: Uint8Array, i: number, opt: JsonOptions): ReadResult<Date> {
    const result = {
        value: Date.prototype,
        nextIndex: 0
    }

    if (tryParseISO8601(b, i, result)) {
        result.nextIndex += 2
        return result
    }

    let start = i
    while (i < b.length && b[i] !== DOUBLE_QUOTE) i++

    const dateStr = opt.decoder.decode(b.subarray(start, i))
    result.value = new Date(dateStr)
    result.nextIndex = i

    if (!isNaN(result.value.valueOf()))
        return result

    throw new Error(`invalid date value, at index ${i}`)
}

function fromTimestamp(b: Uint8Array, i: number): ReadResult<Date> {
    return {
        value: new Date(),
        nextIndex: i
    }
}

const nonDigit = (b: number) => !isDigitUnsafe(b)

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

