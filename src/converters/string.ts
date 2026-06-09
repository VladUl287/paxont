import * as JsonCodes from "../utils/utf8constants"
import { ConvertMeta, ConvertResult, ConvertState } from "./types"
import { skipWhitespace } from "./utils"

export function convertString(
    ctx: ConvertState, metadata: ConvertMeta, index: number, depth: number): ConvertResult<string> {
    const bytes = ctx.bytes

    index = skipWhitespace(bytes, index)

    if (bytes[index] !== JsonCodes.DOUBLE_QUOTE)
        return { error: "not quote" }
    index++

    let start = index
    while (bytes[index] !== JsonCodes.DOUBLE_QUOTE) {
        index++
    }

    const stringValue = ctx.options.decoder.decode(bytes.slice(start, index))
    index++

    return {
        value: stringValue,
        nextIndex: index
    }
}
