import { CollectionMeta, ConvertCtx, MapMeta } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { ConvertResult } from "./types"
import { skipWhitespace } from "./utils"

export function toSet<V>(ctx: ConvertCtx, m: CollectionMeta<Set<V>, V>, i: number, d: number): ConvertResult<Set<V>> {
    const b = ctx.bytes

    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}. depth ${d}`)
    i++

    const result = new Set<V>()
    const mValue = m.value

    let j = 0
    while (true) {
        i = skipWhitespace(b, i)

        const itemResult = mValue.toValue(ctx, mValue, i, d)
        result.add(itemResult.value)
        i = itemResult.nextIndex
        j++

        i = skipWhitespace(b, i)

        if (b[i] === SQUARE_CLOSE)
            break

        if (b[i] !== COMMA)
            throw new Error('not end of value')
        i++
    }

    return {
        value: result,
        nextIndex: ++i
    }
}
