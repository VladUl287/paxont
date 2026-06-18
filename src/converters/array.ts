import { CollectionMeta, ConvertCtx, ConvertResult, MapMeta } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"

export function toArray<V>(ctx: ConvertCtx, m: CollectionMeta<Array<V>, V>, i: number, d: number): ConvertResult<Array<V>> {
    const b = ctx.bytes

    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}. depth ${d}`)
    i++

    const result = new Array<V>()
    const mValue = m.value

    let j = 0
    while (true) {
        i = skipWhitespace(b, i)

        const arrayItemResult = mValue.toValue(ctx, mValue, i, d)
        result[j] = arrayItemResult.value
        i = arrayItemResult.nextIndex
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
