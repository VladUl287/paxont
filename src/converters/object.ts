import { JsonCodes } from "../utils/constants"
import { Metadata } from "../metadata/metadata"
import { ConvertMeta, ConvertResult, ConvertState, isError } from "./types"
import { skipWhitespace } from "./utils"
import { equals } from "../utils/array"

export function convertObject(
    ctx: ConvertState, metadata: ConvertMeta, index: number, depth: number): ConvertResult<object> {
    const bytes = ctx.bytes

    index = skipWhitespace(bytes, index)

    if (bytes[index] !== JsonCodes.CURLY_OPEN)
        throw new Error(`fail parseObject open not found ${index}  ${depth}`)

    index++

    const meta = (metadata as Metadata).value as Metadata[]
    const [fields, i] = toFields(ctx, meta, index, depth)
    const result = (metadata as Metadata).creator!(fields)

    index = i

    if (bytes[index] !== JsonCodes.CURLY_CLOSE)
        throw new Error("fail parseObject close not found")

    return {
        value: result,
        nextIndex: index
    }
}

const fieldResult = new Array<any>(16)
function toFields(ctx: ConvertState, fields: Metadata[], index: number, depth: number): [any[], number] {
    const bytes = ctx.bytes

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i]

        index = skipWhitespace(bytes, index)

        if (bytes[index] !== JsonCodes.DOUBLE_QUOTE)
            throw new Error(`not start of property ${index}`)
        index++

        const equal = equals(field.name!.bytes, bytes, index, 0)
        if (!equal)
            throw new Error(`not correct property ${field.name}`)

        index += field.name!.bytes.length + 1

        if (bytes[index] !== JsonCodes.COLON)
            throw new Error(`not end of property`)
        index++

        index = skipWhitespace(bytes, index)

        const parseResult = ctx.convert(ctx, field, index, depth)
        if(isError(parseResult))
            break

        index = parseResult.nextIndex

        if (bytes[index] === JsonCodes.COMMA) {
            index++
        }

        fieldResult[i] = parseResult.value
    }

    return [fieldResult, index]
}