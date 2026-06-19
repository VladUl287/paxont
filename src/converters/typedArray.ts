import { CollectionMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { parseInt64, parseUint64, parseInt8, parseInt16, parseUint8, parseUint16, parseUint32, parseInt32, parseFloat64, parseFloat32 } from "../utils/number"
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
    switch (m.type) {
        case 'i8[]': return toArray(b, i, i8, parseInt8)
        case 'u8[]': return toArray(b, i, u8, parseUint8)

        case 'i16[]': return toArray(b, i, i16, parseInt16)
        case 'u16[]': return toArray(b, i, u16, parseUint16)

        case 'i32[]': return toArray(b, i, i32, parseInt32)
        case 'u32[]': return toArray(b, i, u32, parseUint32)

        case 'u64[]': return toArray(b, i, u64, parseUint64)
        case 'i64[]': return toArray(b, i, i64, parseInt64)

        case 'f32[]': return toArray(b, i, f32, parseFloat32)
        case 'f64[]': return toArray(b, i, f64, parseFloat64)

        default: throw new Error(`Unsupported TypedArray type '${m.type}' at index ${i}`);
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

function toArray<T extends TypedArray>(
    b: Uint8Array,
    i: number,
    factory: BufferFactory<T>,
    parseValue: Parser<T>
): ConvertResult<T> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`Expected '[' at index ${i}, but found '${b[i]}' while parsing array`)
    i++

    let temp = factory(Math.min(b.length, 1024))
    let tempLength = temp.length

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const result = parseValue(b, i)
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
        value: temp.slice(0, j) as T,
        nextIndex: ++i
    }
}

