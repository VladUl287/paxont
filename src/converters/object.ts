import { skipWhitespace } from "./utils"
import { ReadResult, ReadResultType } from "../utils/types"
import { JsonContext, ObjectFromMeta, ObjectMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, DOUBLE_QUOTE } from "../utils/ascii_symbols"
import { JSONParseError } from "../utils/error"

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function tryParseObject<T extends Record<string, any>>(
    m: ObjectMeta<T>,
    context: JsonContext,
    index: number,
    depth: number,
): ReadResult<ObjectFromMeta<T>> {
    const { reader, options, stack } = context

    if (depth > options.maxDepth)
        return {
            type: ERROR,
            error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${index}`, index)
        }
    depth++

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
            error: new JSONParseError(`Unexpected end of input at index ${i} while parsing object`, i)
        }
    }

    const getFieldIndex = m.getFieldIndex
    const fields = m.fields

    const state = stack.pop()

    const buffer = state?.buffer ?? new Array(fields.length)

    let j = state?.bufferIndex ?? 0
    while (j < fields.length) {
        i = skipWhitespace(b, i)

        let start = i

        if (b[i] !== DOUBLE_QUOTE) {
            if (reader.writable && i > b.length)
                return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${i}`, i)
                }

            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        i++

        const index = getFieldIndex(b, i)
        if (index === -1) {
            if (reader.writable || i < b.length)
                return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${index}`, index)
                }

            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }

        const field = fields[index]
        i += field.name.bytes.length + 1

        if (b[i] !== COLON) {
            if (reader.writable || i < b.length)
                return {
                    type: ERROR,
                    error: new JSONParseError(`Maximum depth of ${options.maxDepth} exceeded at index ${index}`, index)
                }

            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }
        }
        i++

        i = skipWhitespace(b, i)

        const fieldMeta = field.value
        const result = fieldMeta.tryParseValue(fieldMeta, context, i, depth)
        i = result.nextIndex

        if (result.value === undefined || i >= b.length) {
            if (reader.writable) throw new Error(``)
            if (!state) throw new Error()

            state.bufferIndex = j
            state.buffer = buffer
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: start
            }
        }

        if (b[i] === COMMA) i++

        buffer[index] = result.value
        j++
    }

    i = skipWhitespace(b, i)

    if (b[i] !== CURLY_CLOSE) {
        if (reader.writable || i < b.length) throw new Error(``)
        if (!state) throw new Error()

        state.bufferIndex = j
        state.buffer = buffer
        return {
            type: NEEDS_MORE_DATA,
            nextIndex: i
        }
    }

    if (state)
        state.processing = false

    return {
        type: COMPLETE,
        value: m.build(buffer),
        nextIndex: i
    }
}
