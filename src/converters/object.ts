import { skipWhitespace } from "./utils"
import { ReadResult } from "../utils/types"
import { ConvertState, JsonReader, ObjectFromMeta, ObjectMeta } from "../metadata/types"
import { COLON, COMMA, CURLY_CLOSE, CURLY_OPEN, DOUBLE_QUOTE } from "../utils/ascii_symbols"

export function toObject<T extends Record<string, any>>(
    m: ObjectMeta<T>, reader: JsonReader, i: number, d: number, state: ConvertState
): ReadResult<ObjectFromMeta<T>> {
    const b = reader.bytes

    if (i < b.length && b[i] !== CURLY_OPEN && !state?.processing)
        throw new Error(``)
    i++

    if (state)
        state.processing = true

    const getFieldIndex = m.getFieldIndex
    const fields = m.fields

    let buffer = state?.buffer ?? new Array(fields.length)

    let j = state?.bufferIndex ?? 0
    while (j < fields.length) {
        i = skipWhitespace(b, i)

        let start = i

        if (b[i] !== DOUBLE_QUOTE) {
            if (reader.writable || i < b.length) throw new Error(``)

            return { nextIndex: i }
        }
        i++

        const index = getFieldIndex(b, i)
        if (index === -1) {
            if (reader.writable || i < b.length) throw new Error(``)

            return { nextIndex: start }
        }

        const field = fields[index]
        i += field.name.bytes.length + 1

        if (b[i] !== COLON) {
            if (reader.writable || i < b.length) throw new Error(``)

            return { nextIndex: start }
        }
        i++

        i = skipWhitespace(b, i)

        const result = field.value.toValue(reader, field.value, i, d)
        i = result.nextIndex

        if (result.value === undefined || i >= b.length) {
            if (reader.writable) throw new Error(``)
            if (!state) throw new Error()

            state.bufferIndex = j
            state.buffer = buffer
            return { nextIndex: start }
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
        return { nextIndex: i }
    }

    if (state)
        state.processing = false

    return {
        value: m.build(buffer),
        nextIndex: i
    }
}
