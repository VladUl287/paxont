import { BaseMeta, ConvertCtx, isObjectFieldMeta } from "../metadata/types"
import { tryParseISO8601 } from "../utils/date"
import { DOUBLE_QUOTE, isDigit } from "../utils/utf8constants"

export function toDate(ctx: ConvertCtx, meta: BaseMeta<Date>, index: number, _depth: number): Date {
    const i = index
    const b = ctx.bytes

    if (b[i] === DOUBLE_QUOTE) {
        return fromString(b, i)
    }
    else if (isDigit(b[i])) {
        return fromTimestamp(b, i)
    }

    if (isObjectFieldMeta(meta))
        throw new Error(`invalid date value: field '${meta.name.value}', at index ${i}`)

    throw new Error(`invalid date value, at index ${i}`)
}

function fromString(b: Uint8Array, i: number): Date {
    let milliseconds: number = 0
    
    if ((milliseconds = tryParseISO8601(b, i)) > 0)
        return new Date(milliseconds)

    return new Date()
}

function fromTimestamp(b: Uint8Array, i: number): Date {
    return new Date()
}