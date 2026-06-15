import { ConvertCtx, ConvertResult, PrimitiveMeta } from "../metadata/types"
import { DOUBLE_QUOTE } from "../utils/utf8constants"

export function toString(
    ctx: ConvertCtx, _meta: PrimitiveMeta<string>, i: number, _depth: number): ConvertResult<string> {
    const bytes = ctx.bytes

    if (bytes[i] !== DOUBLE_QUOTE)
        throw new Error("")
    i++

    let start = i
    while (bytes[i] !== DOUBLE_QUOTE)
        i++

    const stringValue = ctx.options.decoder.decode(bytes.subarray(start, i))

    return {
        value: stringValue,
        nextIndex: ++i
    }
}
