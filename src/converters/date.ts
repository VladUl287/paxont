import { BaseMeta, ConvertCtx, isObjectFieldMeta } from "../metadata/types"
import { JsonOptions } from "../options"
import { tryParseISO8601 } from "../utils/date"
import { DOUBLE_QUOTE, isDigitU8 } from "../utils/utf8constants"

export function toDate(ctx: ConvertCtx, meta: BaseMeta<Date>, index: number, _depth: number): Date {
    const i = index
    const b = ctx.bytes

    if (b[i] === DOUBLE_QUOTE) {
        return fromString(b, i + 1, ctx.options)
    }
    else if (isDigitU8(b[i])) {
        return fromTimestamp(b, i)
    }

    if (isObjectFieldMeta(meta))
        throw new Error(`invalid date value: field '${meta.name.value}', at index ${i}`)

    throw new Error(`invalid date value, at index ${i}`)
}

function fromString(b: Uint8Array, i: number, opt: JsonOptions): Date {
    let milliseconds: number = 0

    if ((milliseconds = tryParseISO8601(b, i)) >= 0)
        return new Date(milliseconds)

    let start = i
    while (i < b.length && b[i] !== DOUBLE_QUOTE) i++
    const dateString = opt.decoder.decode(b.subarray(start, i))
    const date = new Date(dateString)
    if (!isNaN(date.valueOf()))
        return date

    throw new Error(`invlid date format, at index ${i}`)
}

function fromTimestamp(b: Uint8Array, i: number): Date {
    return new Date()
}