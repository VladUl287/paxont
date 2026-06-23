import { CollectionMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"

const buffer = new Array(1024)

export function toArray<V>(ctx: ConvertCtx, m: CollectionMeta<Array<V>, V>, i: number, d: number): ConvertResult<Array<V>> {
    const b = ctx.bytes

    if (b[i] !== SQUARE_OPEN)
        throw new Error(`Expected '[' at index ${i}, but found '${b[i]}' while parsing array`)
    i++

    const meta = m.value
    const toValue = meta.toValue

    let j = 0
    while (true) {
        i = skipWhitespace(b, i)

        const result = toValue(ctx, meta, i, d)
        buffer[j] = result.value
        i = result.nextIndex
        j++

        if (j > buffer.length)
            buffer.length = buffer.length * 2

        i = skipWhitespace(b, i)

        if (b[i] === COMMA) i++
        else if (b[i] === SQUARE_CLOSE) break
        else throw new Error()
    }

    return {
        value: buffer.slice(0, j),
        nextIndex: ++i
    }
}
