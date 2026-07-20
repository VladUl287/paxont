import { ConvertState, JsonReader, PrimitiveMeta } from "../metadata/types"
import { JsonOptions } from "../options"
import { utc } from "../utils/date"
import { COLON, DOT, DOUBLE_QUOTE, isDigitUnsafe, MINUS, PLUS, T_UPPER, Z } from "../utils/ascii_symbols"
import { isComplete, ReadResult, ReadResultType } from "../utils/types"
import { parseFloat64 } from "./number/float"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function tryParseDate(
    metadata: PrimitiveMeta<Date>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ConvertState
): ReadResult<Date> {
    const b = reader.bytes
    const len = b.length

    if (index < len) {
        if (b[index] === DOUBLE_QUOTE)
            return fromString(b, index + 1, reader.options)

        if (isDigitUnsafe(b[index]))
            return fromTimestamp(b, index)
    }
    else if (reader.writable)
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: index
        }

    return {
        type: ERROR,
        error: new JSONParseError(`Expected date value at index ${index}, but found '${String.fromCharCode(b[index])}'`, index)
    }
}

type TryParseResult = { value: Date, nextIndex: number }

function fromString(b: Uint8Array, i: number, opt: JsonOptions): ReadResult<Date> {
    const result: TryParseResult = {
        value: Date.prototype,
        nextIndex: 0
    }

    if (tryParseISO8601(b, i, result) || tryParseDefault(b, i, result, opt)) {
        return {
            type: COMPLETE,
            value: result.value,
            nextIndex: result.nextIndex
        }
    }

    return {
        type: ERROR,
        error: new JSONParseError(`Invalid date value '${b[i]}' at index ${i}`, i)
    }
}

function fromTimestamp(b: Uint8Array, i: number): ReadResult<Date> {
    const result = parseFloat64(b, i)

    if (isComplete(result)) {
        const date = new Date(result.value)

        if (isNaN(date.getTime()))
            throw new Error(`Invalid date value '${b[i]}' at index ${i}`)

        return {
            value: date,
            nextIndex: result.nextIndex
        } as any
    }

    return {} as any
}

function tryParseDefault(b: Uint8Array, i: number, r: TryParseResult, options: JsonOptions): boolean {
    let start = i

    const len = b.length
    while (i < len && b[i] !== DOUBLE_QUOTE) i++

    const decoder = options.decoder
    const view = new Uint8Array(b.buffer, start, i - start)
    const dateString = decoder.decode(view)

    const date = new Date(dateString)
    r.value = date
    r.nextIndex = ++i

    return !isNaN(date.valueOf())
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

function tryParseISO8601(b: Uint8Array, i: number, r: TryParseResult): boolean {
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

