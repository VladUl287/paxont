import { ConvertCtx, ConvertResult, MapMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN, DOUBLE_QUOTE } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"

export function toMap<V>(ctx: ConvertCtx, meta: MapMeta<V>, index: number, depth: number): ConvertResult<Map<string, V>> {
    const b = ctx.bytes

    if (b[index] !== CURLY_OPEN)
        throw new Error(`object open not found at position ${index}. depth ${depth}`)

    index++

    const map = new Map<string, V>()

    while (true) {
        index = skipWhitespace(b, index)

        if (b[index] !== DOUBLE_QUOTE)
            throw new Error(`not start of property ${index}`)
        index++

        const key = meta.key.toValue(ctx, meta.key, index, depth)
        index = key.nextIndex

        if (b[index] !== COLON)
            throw new Error(`not end of property`)
        index++

        index = skipWhitespace(b, index)

        const value = meta.value.toValue(ctx, meta.value, index, depth)
        index = value.nextIndex

        map.set(key.value, value.value)

        index = skipWhitespace(b, index)

        if (b[index] === COMMA || b[index] === CURLY_CLOSE)
            break
    }

    return {
        value: map,
        nextIndex: ++index
    }
}
