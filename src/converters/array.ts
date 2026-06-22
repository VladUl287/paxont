import { CollectionMeta, ConvertCtx, ConvertResult, MapMeta } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"

const temp = new Array(1024)
export function toArray<V>(ctx: ConvertCtx, m: CollectionMeta<Array<V>, V>, i: number, d: number): ConvertResult<Array<V>> {
    const b = ctx.bytes

    if (b[i] !== SQUARE_OPEN)
        throw new Error(`Expected '[' at index ${i}, but found '${b[i]}' while parsing array`)
    i++

    const meta = m.value
    const toValue = meta.toValue

    let j = 0
    while (i < b.length && b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const result = toValue(ctx, meta, i, d)
        temp[j] = result.value
        i = result.nextIndex
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: temp.slice(0, j),
        nextIndex: ++i
    }
}
