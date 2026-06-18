import { BaseMeta, ConvertCtx, ConvertResult, isObjectFieldMeta } from "../metadata/types"
import { JsonOptions } from "../options"
import { tryParseISO8601 } from "../utils/date"
import { DOUBLE_QUOTE, isDigitU8 } from "../utils/utf8constants"

export function toDate(ctx: ConvertCtx, meta: BaseMeta<Date>, index: number, _depth: number): ConvertResult<Date> {
    const i = index
    const b = ctx.bytes
    const len = b.length

    if (i < len) {
        if (b[i] === DOUBLE_QUOTE)
            return fromString(b, i + 1, ctx.options)

        if (isDigitU8(b[i]))
            return fromTimestamp(b, i)
    }

    if (isObjectFieldMeta(meta))
        throw new Error(`invalid date value: field '${meta.name.value}', at index ${i}`)

    throw new Error(`invalid date value, at index ${i}`)
}

function fromString(b: Uint8Array, i: number, opt: JsonOptions): ConvertResult<Date> {
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

function fromTimestamp(b: Uint8Array, i: number): ConvertResult<Date> {
    return {
        value: new Date(),
        nextIndex: i
    }
}