import { skipWhitespace } from "./utils"
import { isError, isNeedsMoreData, ReadResult, ReadResultType } from "../utils/types"
import { ParseContext, ObjectFromMeta, ObjectMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN, DOUBLE_QUOTE } from "../utils/ascii_symbols"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function toObject<T extends Record<string, any>>(
    m: ObjectMeta<T>,
    context: ParseContext,
    index: number,
    depth: number,
): ReadResult<ObjectFromMeta<T>> {
    const { reader, options, stack } = context

    if (depth > options.maxDepth)
        return {
            type: ERROR,
            error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${index}`)
        }
    depth++

    const fields = m.fields

    let isContinued: boolean
    let buffer: Array<any>
    let bufferIndex: number
    let fieldIndex: number | undefined

    const state = stack.pop()

    if (state !== undefined) {
        isContinued = state.isContinued
        buffer = state.buffer
        bufferIndex = state.bufferIndex
        fieldIndex = state.fieldIndex
    }
    else {
        isContinued = false
        buffer = new Array(fields.length)
        bufferIndex = 0
        fieldIndex = undefined
    }

    const b = reader.bytes
    const len = b.length

    let i = index
    if (i >= len) {
        if (reader.writable)
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }

        return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input at index ${i} while parsing object`)
        }
    }

    const getFieldIndex = m.getFieldIndex

    if (!isContinued) {
        if (b[i] !== CURLY_OPEN) return {
            type: ERROR,
            error: new JSONParseError(`Unexpected end of input at index ${i} while parsing object`)
        }
        i++
    }

    let j = bufferIndex
    while (j < fields.length) {
        i = skipWhitespace(b, i)

        let field
        let index = fieldIndex
        if (index === undefined) {
            const start = i

            if (b[i] !== DOUBLE_QUOTE) {
                if (i < b.length && !reader.writable) return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${i}`)
                }

                stack.push({
                    isContinued: true,
                    buffer,
                    bufferIndex: j
                })

                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: start
                }
            }
            i++

            index = getFieldIndex(b, i)
            if (index === -1) {
                if (i < b.length && !reader.writable) return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${i}`)
                }

                stack.push({
                    isContinued: true,
                    buffer,
                    bufferIndex: j
                })

                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: start
                }
            }

            field = fields[index]
            i += field.name.bytes.length + 1

            if (b[i] !== COLON) {
                if (i < b.length && !reader.writable) return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${i}`)
                }

                stack.push({
                    isContinued: true,
                    buffer,
                    bufferIndex: j
                })

                return {
                    type: NEEDS_MORE_DATA,
                    nextIndex: start
                }
            }
            i++
        }
        else {
            field = fields[index]
            fieldIndex = undefined
        }

        i = skipWhitespace(b, i)

        const fieldMeta = field.value
        const result = fieldMeta.toValue(fieldMeta, context, i, depth)

        if (isError(result))
            return result

        if (isNeedsMoreData(result)) {
            stack.push({
                isContinued: true,
                buffer,
                bufferIndex: j,
                fieldIndex: index
            })
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        i = result.nextIndex

        if (b[i] === COMMA) i++

        buffer[index] = result.value
        j++
    }

    i = skipWhitespace(b, i)

    if (b[i] !== CURLY_CLOSE) {
        if (!reader.writable || i < b.length) {
            return {
                type: ERROR,
                error: new JSONParseError(``)
            }
        }

        stack.push({
            isContinued: true,
            buffer,
            bufferIndex: j,
            fieldIndex: index
        })
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }
    }

    return {
        type: COMPLETE,
        value: m.build(buffer),
        nextIndex: ++i
    }
}
