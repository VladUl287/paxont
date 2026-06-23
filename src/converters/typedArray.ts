import { CollectionMeta, ConvertCtx, ConvertResult, TypeName } from "../metadata/types"
import { TypedArray, TypedArrayCtor } from "../utils/typedArray"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"

export function toTypedArray(
    ctx: ConvertCtx,
    m: CollectionMeta<TypedArray, TypedArray[number]>,
    i: number,
    d: number
): ConvertResult<TypedArray> {
    if (d > ctx.options.maxDepth)
        throw new Error(`Maximum depth exceeded: limit ${ctx.options.maxDepth} at index ${i}`);

    const b = ctx.bytes

    if (b[i] !== SQUARE_OPEN)
        throw new Error(`Expected '[' at index ${i}, but found '${b[i]}' while parsing array`)
    i++

    const factory = builder(m.type)

    let temp = factory(Math.min(1024, b.length))
    let tempLength = temp.length

    const value = m.value
    const toValue = m.value.toValue

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const result = toValue(ctx, value, i, d)
        temp[j] = result.value
        i = result.nextIndex
        j++

        if (j >= tempLength)
            temp = factory(temp.length * 2, temp)

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: temp.slice(0, j),
        nextIndex: ++i
    }
}

type Parser<T extends TypedArray> = (b: Uint8Array, i: number) => ConvertResult<T[number]>
type BufferFactory<T extends TypedArray> = (length: number, source?: T) => T

const i8 = createFactory<Int8Array>(Int8Array)
const u8 = createFactory<Uint8Array>(Uint8Array)
const i16 = createFactory<Int16Array>(Int16Array)
const u16 = createFactory<Uint16Array>(Uint16Array)
const i32 = createFactory<Int32Array>(Int32Array)
const u32 = createFactory<Uint32Array>(Uint32Array)
const i64 = createFactory<BigInt64Array>(BigInt64Array)
const u64 = createFactory<BigUint64Array>(BigUint64Array)
const f32 = createFactory<Float32Array>(Float32Array)
const f64 = createFactory<Float64Array>(Float64Array)

const builder = (type: TypeName): BufferFactory<TypedArray> => {
    switch (type) {
        case 'i8[]': i8
        case 'u8[]': u8
        case 'i16[]': i16
        case 'u16[]': u16

        case 'i32[]': i32
        case 'u32[]': u32

        case 'i64[]': i64
        case 'u64[]': u64

        case 'f32[]': f32
        case 'f64[]': f64

        default: throw new Error(`error`)
    }
}

function createFactory<T extends TypedArray>(ctor: TypedArrayCtor<T>): BufferFactory<T> {
    let array: T | null = null
    return (length, source) => {
        if (array?.length === length)
            return array

        array = new ctor(length) as T

        if (source)
            array.set(source as any)

        return array
    }
}
