import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../../utils/result"
import { AsObject, BaseMeta, JsonParsingContext, ObjectMeta } from "../../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN, DOUBLE_QUOTE } from "../../utils/ascii_symbols"
import { JSONParseError } from "../../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toObject<T extends { [k: string]: BaseMeta<any> }>(
    meta: ObjectMeta<T>, context: JsonParsingContext
): ReadResult<AsObject<T>> {
    const { reader, options, stack, depth } = context
    const { bytes: b, bytesLength: len, writable, position } = reader

    let i = position
    let d = depth + 1

    if (d > options.maxDepth) {
        return {
            type: ERROR,
            error: new JSONParseError(`Maximum depth exceeded`, { metadata: meta, index: i, depth: d })
        }
    }
    context.setDepth(d)

    const fields = meta.fields

    const state = stack.pop()

    const isContinued: boolean = state?.isContinued ?? false
    const buffer: Array<any> = state?.buffer ?? new Array(fields.length)

    const getFieldIndex = meta.getFieldIndex

    let bufferIndex: number = state?.bufferIndex ?? 0
    if (!isContinued) {
        if (b[i] !== CURLY_OPEN) {
            if (i >= len && writable) {
                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: i
                }
            }
            return {
                type: ERROR,
                error: new JSONParseError(`Unexpected end of input at index ${i} while parsing object`)
            }
        }
        i++
    }
    else {
        if (b[i] === COMMA) {
            if (bufferIndex === fields.length) {
                return {
                    type: ERROR,
                    error: new JSONParseError('trailing comma')
                }
            }
            i++
        }
    }

    let fieldIndex: number = state?.fieldIndex ?? -1
    while (bufferIndex < fields.length) {
        let field
        if (fieldIndex === -1) {
            i = reader.skipWhitespace(i)

            const start = i

            if (b[i] !== DOUBLE_QUOTE) {
                if (i >= len && writable) {
                    stack.push({ isContinued: true, buffer, bufferIndex })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: start
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError('Maximum depth exceeded', { metadata: meta, index: i, depth: d })
                }
            }
            i++

            fieldIndex = getFieldIndex(b, i)
            if (fieldIndex === -1) {
                if (writable) {
                    stack.push({ isContinued: true, buffer, bufferIndex })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: start
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError('Maximum depth exceeded')
                }
            }

            field = fields[fieldIndex]
            i += field.name.bytes.length

            if (b[i] !== DOUBLE_QUOTE) {
                if (i >= len && writable) {
                    stack.push({ isContinued: true, buffer, bufferIndex })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: start
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError('Maximum depth exceeded', { metadata: meta, index: i, depth: d })
                }
            }
            i++

            if (b[i] !== COLON) {
                if (i >= len && writable) {
                    stack.push({ isContinued: true, buffer, bufferIndex })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: start
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${i}`)
                }
            }
            i = reader.skipWhitespace(++i)
        }
        else {
            field = fields[fieldIndex]
            if (!state?.inValue) {
                i = reader.skipWhitespace(i)
            }
        }

        reader.setPosition(i)

        const fieldMeta = field.value
        const result = fieldMeta.toValue(fieldMeta, context)

        if (isError(result)) { return result }

        i = result.nextIndex

        if (isNeedsMoreData(result)) {
            stack.push({ isContinued: true, buffer, bufferIndex, fieldIndex, inValue: true })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        if (b[i] === COMMA) {
            if (bufferIndex === fields.length - 1) {
                return {
                    type: ERROR,
                    error: new JSONParseError('trailing comma')
                }
            }
            i++
        }

        buffer[fieldIndex] = result.value
        fieldIndex = -1
        bufferIndex++
    }

    i = reader.skipWhitespace(i)

    if (b[i] !== CURLY_CLOSE) {
        if (i >= len && writable) {
            stack.push({ isContinued: true, buffer, bufferIndex })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        return {
            type: ERROR,
            error: new JSONParseError(``)
        }
    }

    context.setDepth(depth)

    return {
        type: COMPLETE,
        value: meta.build(buffer),
        nextIndex: ++i
    }
}
