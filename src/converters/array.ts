import { BaseMeta, CollectionMeta, JsonReader, TypeName } from "../metadata/types"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { ReadResult, ReadResultType } from "../utils/types"

type BaseState = {
    isPartial: boolean
}

type ArrayState<T> = BaseState & {
    buffer?: ArrayLike<T>,
    bufferIndex?: number,
    lastState?: Record<string, any>
}

export function toArray<T, M extends BaseMeta<T, M>>(
    metadata: CollectionMeta<ArrayLike<T>, T, M>,
    reader: JsonReader,
    index: number,
    depth: number,
    state: ArrayState<T>,
): ReadResult<ArrayLike<T>> {
    if (depth > reader.options.maxDepth)
        return {
            type: ReadResultType.ERROR,
            error: new Error(''),
            nextIndex: index
        }

    const b = reader.bytes
    const len = b.length

    let i = index
    if (i >= len) {
        if (reader.writable)
            return {
                type: ReadResultType.NEEDS_MORE_DATA,
                nextIndex: i
            }

        return {
            type: ReadResultType.ERROR,
            error: new Error(''),
            nextIndex: i
        }
    }

    if (!state.isPartial) {
        if (b[i] !== SQUARE_OPEN)
            throw new Error(`Expected '[' at index ${index}, but found '${b[index]}' while parsing array`)
        i++
    }

    const factory = getFactory(metadata.type)

    let buffer = state?.buffer ?? factory(Math.min(1024, b.length - index))

    const meta = metadata.value
    const toValue = meta.toValue

    const valueState = state?.lastState ?? {}

    let j = state?.bufferIndex ?? 0
    while (true) {
        index = skipWhitespace(b, index)

        const result = toValue(reader, meta, index, depth, valueState)

        if (result.value === undefined) {
            if (state) {
                state.bufferIndex = j
                state.buffer = buffer
                state.lastState = valueState
            }
            return {
                nextIndex: index
            }
        }

        buffer[j] = result.value
        index = result.nextIndex
        j++

        if (j >= buffer.length)
            buffer = factory(buffer.length * 2, buffer)

        index = skipWhitespace(b, index)

        if (b[index] === COMMA) index++
        else if (b[index] === SQUARE_CLOSE) break
        else throw new Error()
    }

    return {
        value: buffer.slice(0, j) as any,
        nextIndex: ++index
    }
}


const array = createFactory(Array)
const i8 = createFactory(Int8Array)
const u8 = createFactory(Uint8Array)
const i16 = createFactory(Int16Array)
const u16 = createFactory(Uint16Array)
const i32 = createFactory(Int32Array)
const u32 = createFactory(Uint32Array)
const i64 = createFactory(BigInt64Array)
const u64 = createFactory(BigUint64Array)
const f32 = createFactory(Float32Array)
const f64 = createFactory(Float64Array)

const getFactory = <T>(type: TypeName): BufferFactory<any> => {
    switch (type) {
        case 'array': return array

        case 'i8[]': return i8
        case 'u8[]': return u8
        case 'i16[]': return i16
        case 'u16[]': return u16

        case 'i32[]': return i32
        case 'u32[]': return u32

        case 'i64[]': return i64
        case 'u64[]': return u64

        case 'f32[]': return f32
        case 'f64[]': return f64

        default: throw new Error(`error`)
    }
}

type BufferFactory<T extends ArrayLike<any>> = (length: number, source?: T) => T

function createFactory<T extends ArrayLike<any>>(ctor: new (length: number) => T): BufferFactory<T> {
    let array: T | null = null
    return (length, source) => {
        if (array && array.length >= length)
            return array

        if (Array.isArray(array) && Array.isArray(source)) {
            source.length = source.length * 2
            return source
        }

        array = new ctor(length)

        return array
    }
}
