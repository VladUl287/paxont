import { BaseMeta, CollectionMeta, JsonReader, TypeName } from "../metadata/types"
import { TypedArray } from "../utils/typedArray"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"
import { ReadResult } from "../utils/types"

type ArrayLike<T> = T[] | TypedArray

export function toArray<C extends ArrayLike<T>, T, M extends BaseMeta<T, M>>(
    ctx: JsonReader, m: CollectionMeta<C, T, M>, i: number, d: number, state?: Record<string, any>
): ReadResult<C> {
    const b = ctx.bytes

    if (i >= b.length) {
        if (ctx.writable) throw new Error(``)
        return { nextIndex: i }
    }

    if (b[i] !== SQUARE_OPEN) {
        if (!state?.processing)
            throw new Error(`Expected '[' at index ${i}, but found '${b[i]}' while parsing array`)
    }
    else i++

    const factory = getFactory(m.type)

    let buffer = state?.buffer ?? factory(Math.min(1024, b.length - i))

    const meta = m.value
    const toValue = meta.toValue

    const valueState = state?.lastState ?? {}

    let j = state?.bufferIndex ?? 0
    while (true) {
        i = skipWhitespace(b, i)

        const result = toValue(ctx, meta, i, d, valueState)

        if (result.value === undefined) {
            if (state) {
                state.bufferIndex = j
                state.buffer = buffer
                state.lastState = valueState
            }
            return {
                nextIndex: i
            }
        }

        buffer[j] = result.value
        i = result.nextIndex
        j++

        if (j >= buffer.length)
            buffer = factory(buffer.length * 2, buffer)

        i = skipWhitespace(b, i)

        if (b[i] === COMMA) i++
        else if (b[i] === SQUARE_CLOSE) break
        else throw new Error()
    }

    return {
        value: buffer.slice(0, j) as any,
        nextIndex: ++i
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

        if (source)
            (array as TypedArray).set(source as any)

        return array
    }
}
