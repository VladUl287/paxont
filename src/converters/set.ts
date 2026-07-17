import { BaseMeta, CollectionMeta, JsonReader } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { ReadResult } from "../utils/types"

export function toSet<V>(
    ctx: JsonReader, m: CollectionMeta<Set<V>, V, BaseMeta<V, any>>, i: number, d: number
): ReadResult<Set<V>> {
    const b = ctx.bytes

    if (b[i] !== SQUARE_OPEN)
        throw new Error(`Expected '[' at index ${i}, but found '${String.fromCharCode(b[i])}' while parsing Set`)
    i++

    const set = new Set<V>()
    const valueMeta = m.value

    let j = 0
    while (true) {
        i = skipWhitespace(b, i)

        const itemResult = valueMeta.toValue(ctx, valueMeta, i, d)
        if (!itemResult.value) {
            if (ctx.writable)
                return { nextIndex: i }

            throw new Error()
        }

        set.add(itemResult.value)
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
        value: set,
        nextIndex: ++i
    }
}
