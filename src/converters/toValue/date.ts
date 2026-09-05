import { JsonParsingContext, PrimitiveMeta } from "../../metadata/types"
import { utc } from "../../utils/utc"
import { COLON, DOT, DOUBLE_QUOTE, MINUS, PLUS, T_UPPER, Z } from "../../utils/ascii_symbols"
import { isComplete, ReadResult, ReadResultType } from "../../utils/result"
import { JSONParseError } from "../../utils/error"
import { tryParseFloat } from "./number/float"
import { isDigitU } from "../../utils/ascii"
import { float64 } from "./number/floatFormats"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toDate(metadata: PrimitiveMeta<Date>, context: JsonParsingContext): ReadResult<Date> {
    const { reader: { bytes: b, bytesLength: len, writable, position } } = context

    let i = position
    if (i < len) {
        if (b[i] === DOUBLE_QUOTE)
            return fromString(context)

        if (isDigitU(b[i]))
            return fromTimestamp(context)
    }
    else if (writable) {
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }
    }

    return {
        type: ERROR,
        error: new JSONParseError(`Expected date value, but found '${String.fromCharCode(b[i])}'`)
    }
}

function fromString(context: JsonParsingContext): ReadResult<Date> {
    const { reader: { bytes: b, bytesLength: bytesLen, writable, position }, options } = context

    const start = position
    
    let i = start
    if (b[i] !== DOUBLE_QUOTE) {
        if (i >= bytesLen && writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        return {
            type: ERROR,
            error: new JSONParseError('')
        }
    }
    i++

    if (!writable) {
        let result: Extract<ReadResult<Date>, { type: typeof COMPLETE }> | undefined
        if ((result = tryParseISO8601(b, bytesLen, i)) !== undefined) {
            if (b[result.nextIndex - 1] === DOUBLE_QUOTE) {
                return result
            }
        }
    }

    while (i < bytesLen && b[i] !== DOUBLE_QUOTE) i++

    if (b[i] !== DOUBLE_QUOTE) {
        if (writable) {
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: start
            }
        }
        return {
            type: ERROR,
            error: new JSONParseError('')
        }
    }

    let result: Extract<ReadResult<Date>, { type: typeof COMPLETE }> | undefined
    if ((result = tryParseISO8601(b, bytesLen, i)) !== undefined) {
        if (b[result.nextIndex - 1] === DOUBLE_QUOTE) {
            return result
        }
    }

    const st = start + 1
    const view = new Uint8Array(b.buffer, st, i - st)
    const date = options.decoder.decode(view)
    const value = new Date(date)

    if (isNaN(value.getTime())) {
        return {
            type: ERROR,
            error: new JSONParseError('')
        }
    }

    return {
        type: COMPLETE,
        value: value,
        nextIndex: i + 1
    }
}

const nonDigit = (b: number) => !isDigitU(b)

function expectFourDigits(b: Uint8Array, len: number, i: number): number {
    if (i + 4 >= len || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[++i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function expectThreeDigits(b: Uint8Array, len: number, i: number): number {
    if (i + 3 >= len || nonDigit(b[i]) || nonDigit(b[++i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function expectTwoDigits(b: Uint8Array, len: number, i: number): number {
    if (i + 2 >= len || nonDigit(b[i]) || nonDigit(b[++i]))
        return -1
    return ++i
}

function tryParseISO8601(b: Uint8Array, len: number, i: number): Extract<ReadResult<Date>, { type: typeof COMPLETE }> | undefined {
    if ((i = expectFourDigits(b, len, i)) < 0) //YYYY
        return

    const YYYY = ((b[i - 4] & 0x0F) * 1000) + ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (b[i++] !== MINUS) {
        return {
            type: COMPLETE,
            value: new Date(YYYY, 0),
            nextIndex: i
        }
    }

    if ((i = expectTwoDigits(b, len, i)) < 0) //MM
        return

    const MM = (((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)) - 1
    if (MM < 0 || MM > 11)
        return

    if (b[i++] !== MINUS) {
        return {
            type: COMPLETE,
            value: new Date(YYYY, MM),
            nextIndex: i
        }
    }

    if ((i = expectTwoDigits(b, len, i)) < 0) //DD
        return

    const DD = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (DD < 1 || DD > 31)
        return

    if (b[i++] !== T_UPPER) {
        return {
            type: COMPLETE,
            value: new Date(YYYY, MM, DD),
            nextIndex: i
        }
    }

    if ((i = expectTwoDigits(b, len, i)) < 0 || b[i++] !== COLON || (i = expectTwoDigits(b, len, i)) < 0) //HH:mm
        return

    const HH = ((b[i - 5] & 0x0F) * 10) + (b[i - 4] & 0x0F)
    if (HH < 0 || HH > 23)
        return

    const mm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (mm < 0 || mm > 59)
        return

    let ss = 0
    let sss = 0
    if (b[i] === COLON) {
        i++

        if ((i = expectTwoDigits(b, len, i)) < 0) //ss
            return

        ss = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
        if (ss < 0 || ss > 59)
            return

        if (b[i] === DOT) {
            i++

            if ((i = expectThreeDigits(b, len, i)) < 0) //sss
                return

            sss = ((b[i - 3] & 0x0F) * 100) + ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
            if (sss < 0 || ss > 999)
                return
        }
    }

    if (b[i] === Z) { //Z
        return {
            type: COMPLETE,
            value: new Date(utc(YYYY, MM, DD, HH, mm, ss, sss)),
            nextIndex: i + 2
        }
    }

    if (b[i] !== MINUS && b[i] !== PLUS) { //not ±
        return {
            type: COMPLETE,
            value: new Date(YYYY, MM, DD, HH, mm, ss, sss),
            nextIndex: i + 1
        }
    }

    const sign = b[i++] === MINUS ? -1 : 1

    if ((i = expectTwoDigits(b, len, i)) < 0 || b[i++] !== COLON || (i = expectTwoDigits(b, len, i)) < 0) //HH:mm
        return

    const ZHH = ((b[i - 5] & 0x0F) * 10) + (b[i - 4] & 0x0F)
    if (ZHH < 0 || ZHH > 23)
        return

    const zmm = ((b[i - 2] & 0x0F) * 10) + (b[i - 1] & 0x0F)
    if (zmm < 0 || zmm > 59)
        return

    return {
        type: COMPLETE,
        value: new Date(utc(YYYY, MM, DD, HH - (ZHH * sign), mm - (zmm * sign), ss, sss)),
        nextIndex: i + 1
    }
}

function fromTimestamp(context: JsonParsingContext): ReadResult<Date> {
    const maxValue = 8_640_000_000_000_000
    const minValue = -8_640_000_000_000_000

    const result = tryParseFloat(context, float64)

    if (isComplete(result)) {
        const value = result.value

        if (value < minValue || value > maxValue) {
            return {
                type: ERROR,
                error: new JSONParseError('')
            }
        }

        const date = new Date(value)

        if (isNaN(date.getTime())) {
            return {
                type: ERROR,
                error: new JSONParseError('')
            }
        }

        return {
            type: COMPLETE,
            value: date,
            nextIndex: result.nextIndex
        }
    }

    return result
}
