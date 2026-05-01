import { JsonCodes } from "../utils/constants"
import { ConvertMeta, ConvertResult, ConvertState, isError, isMultiMeta, isSingleMeta } from "./types"
import { skipWhitespace } from "./utils"

const fields = new Array<any>(16)
export function convertObject(
    ctx: ConvertState, metadata: ConvertMeta, index: number, depth: number): ConvertResult<object> {
    const bytes = ctx.bytes

    if (isMultiMeta(metadata))
        throw new Error('invalid metadata for object')

    index = skipWhitespace(bytes, index)

    if (bytes[index] !== JsonCodes.CURLY_OPEN)
        throw new Error(`object open not found at position ${index}. depth ${depth}`)

    index++

    const getFieldIndex = metadata.getFieldIndex!

    const metaFields = metadata.value
    if (!metaFields || isSingleMeta(metaFields))
        throw new Error('invalid metadata value for object')

    for (let i = 0; i < metaFields.length; i++) {
        const metaField = metaFields[i]

        index = skipWhitespace(bytes, index)

        if (bytes[index] !== JsonCodes.DOUBLE_QUOTE)
            throw new Error(`not start of property ${index}`)
        index++

        const fieldIndex = getFieldIndex(bytes, index)
        if (fieldIndex === -1)
            throw new Error(`not correct property ${metaField.name}`)

        index += metaField.name!.bytes.length + 1

        if (bytes[index] !== JsonCodes.COLON)
            throw new Error(`not end of property`)
        index++

        index = skipWhitespace(bytes, index)

        const parseResult = metaField.convert(ctx, metaField, index, depth)
        if (isError(parseResult))
            break

        index = parseResult.nextIndex

        if (bytes[index] === JsonCodes.COMMA) {
            index++
        }

        fields[fieldIndex] = parseResult.value
    }

    if (!metadata.creator)
        throw new Error('metadata object creator not presented')

    index = skipWhitespace(bytes, index)

    if (bytes[index] !== JsonCodes.CURLY_CLOSE)
        throw new Error(`object close not found ${index}. depth ${depth}`)

    const result = metadata.creator(fields)

    return {
        value: result,
        nextIndex: index
    }
}
