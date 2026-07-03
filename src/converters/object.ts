import { skipWhitespace } from "./utils"
import { ReadResult } from "../utils/types"
import { BaseMeta, ConvertCtx, ExtractType, ObjectFieldMeta, ObjectFromMeta1, ObjectFromMeta2, ObjectMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN, DOUBLE_QUOTE } from "../utils/utf8constants"

const fieldsBuffer = new Array<any>(16)

export function toObject<T extends Record<string, BaseMeta<ExtractType<T[keyof T]>, T[keyof T]>>>(
    ctx: ConvertCtx, m: ObjectMeta<T>, i: number, d: number
): ReadResult<ObjectFromMeta2<T>> {
    const b = ctx.bytes

    if (b[i] !== CURLY_OPEN)
        throw new Error(``)
    i++

    const getFieldIndex = m.getFieldIndex
    const fields = m.fields

    let j = 0
    while (j < fields.length) {
        i = skipWhitespace(b, i)

        if (b[i] !== DOUBLE_QUOTE)
            throw new Error(``)
        i++

        const index = getFieldIndex(b, i)
        if (index === -1)
            throw new Error(``)

        const field = fields[index]
        i += field.name.bytes.length + 1

        if (b[i] !== COLON)
            throw new Error(``)
        i++

        i = skipWhitespace(b, i)

        const result = field.value.toValue(ctx, field.value, i, d)
        i = result.nextIndex

        if (b[i] === COMMA) i++

        fieldsBuffer[index] = result.value
        j++
    }

    i = skipWhitespace(b, i)

    if (b[i] !== CURLY_CLOSE)
        throw new Error(``)

    return {
        value: m.build(fieldsBuffer),
        nextIndex: i
    }
}
