import { CollectionMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { parseInt64, parseUint64, parseInt8, parseInt16, parseUint8, parseUint16, parseUint32, parseInt32, parseFloat64, parseFloat32 } from "../utils/number"
import { TypedArray, TypedArrayCtor } from "../utils/typedArray"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { skipWhitespace } from "./utils"

export function toTypedArray(ctx: ConvertCtx, m: CollectionMeta<TypedArray, TypedArray[number]>, i: number, d: number): ConvertResult<TypedArray> {
    const b = ctx.bytes

    switch (m.type) {
        case 'i8[]': return toArray(b, i, Int8Array, i8, parseInt8)
        case 'u8[]': return toArray(b, i, Uint8Array, u8, parseUint8)

        case 'i16[]': return toArray(b, i, Int16Array, i16, parseInt16)
        case 'u16[]': return toArray(b, i, Uint16Array, u16, parseUint16)

        case 'i32[]': return toArray(b, i, Int32Array, i32, parseInt32)
        case 'u32[]': return toArray(b, i, Uint32Array, u32, parseUint32)

        case 'u64[]': return toArray(b, i, BigUint64Array, u64, parseUint64)
        case 'i64[]': return toArray(b, i, BigInt64Array, i64, parseInt64)

        case 'f32[]': return toArray(b, i, Float32Array, f32, parseFloat32)
        case 'f64[]': return toArray(b, i, Float32Array, f32, parseFloat64)

        default:
            throw new Error(`not supported typed array '${m.type}'`)
    }
}

const TEMP_SIZE = 1024

let _i8: Int8Array | null = null
const i8 = () => (_i8 ??= new Int8Array(TEMP_SIZE))
let _u8: Uint8Array | null = null
const u8 = () => (_u8 ??= new Uint8Array(TEMP_SIZE))

let _i16: Int16Array | null = null
const i16 = () => (_i16 ??= new Int16Array(TEMP_SIZE))
let _u16: Uint16Array | null = null
const u16 = () => (_u16 ??= new Uint16Array(TEMP_SIZE))

let _i32: Int32Array | null = null
const i32 = () => (_i32 ??= new Int32Array(TEMP_SIZE))
let _u32: Uint32Array | null = null
const u32 = () => (_u32 ??= new Uint32Array(TEMP_SIZE))

let _i64: BigInt64Array | null = null
const i64 = () => (_i64 ??= new BigInt64Array(TEMP_SIZE))
let _u64: BigUint64Array | null = null
const u64 = () => (_u64 ??= new BigUint64Array(TEMP_SIZE))

let _f32: Float32Array | null = null
const f32 = () => (_f32 ??= new Float32Array(TEMP_SIZE))
let _f64: Float64Array | null = null
const f64 = () => (_f64 ??= new Float64Array(TEMP_SIZE))

type Parser<T extends TypedArray> = (
    b: Uint8Array,
    i: number
) => ConvertResult<T[number]>

function toArray<T extends TypedArray>(
    b: Uint8Array, i: number, ctor: TypedArrayCtor<T>,
    buffer: () => T, parseValue: Parser<T>): ConvertResult<T> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let temps: T[] | null = null
    const temp = buffer()
    const tempLength = temp.length

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)
        const result = parseValue(b, i)
        temp[j] = result.value
        i = result.nextIndex
        j++

        if (j >= tempLength) {
            (temps ??= []).push(temp.slice(0) as T)
            j = 0
        }

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    if (temps !== null) {
        const allElements = temps.flatMap((t) => [...t]) as any
        const remainingElements = [...temp.slice(0, j)] as any
        return {
            value: new ctor([...allElements, ...remainingElements]) as T,
            nextIndex: ++i
        }
    }

    return {
        value: temp.slice(0, j) as T,
        nextIndex: ++i
    }
}

