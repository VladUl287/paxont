import { CollectionMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { f32Format, f64Format, parseNumber, parseInt64, parseUint64, parseInt8 } from "../utils/number"
import { TypedArray, TypedArrayCtor, TypedArrayCtors, TypedArrayElement } from "../utils/typedArray"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { parseNumberF64_2 } from "./number_opt"
import { skipWhitespace } from "./utils"

export function toTypedArray(ctx: ConvertCtx, m: CollectionMeta<TypedArray, TypedArray[number]>, i: number, d: number): ConvertResult<TypedArray> {
    const b = ctx.bytes

    switch (m.type) {
        case 'u8[]': return toIntArray1(b, i, Uint8Array, () => new Uint8Array(), parseInt8)
        case 'u16[]': return toIntArray(b, i, 5, 0, 65535, Uint16Array)
        case 'u32[]': return toIntArray(b, i, 10, 0, 4294967295, Uint32Array)
        case 'i8[]': return toIntArray(b, i, 3, -128, 127, Int8Array)
        case 'i16[]': return toIntArray(b, i, 3, -128, 127, Int16Array)
        case 'i32[]': return toIntArray(b, i, 3, -2147483648, 2147483647, Int32Array)

        case 'u64[]': return toUInt64Array(b, i)
        case 'i64[]': return toInt64Array(b, i)

        case 'f32[]': return toF32Array(b, i)
        case 'f64[]': return toF64Array(b, i)

        default:
            throw new Error(`not supported typed array '${m.type}'`)
    }
}

type Parser<T> = (
    b: Uint8Array,
    i: number,
    target: T,
    targetIndex: number
) => number

type InternalLazy = {
    _u8: Uint8Array | null,
    readonly u8: Uint8Array
    _u64: BigUint64Array | null,
    readonly u64: BigUint64Array,
    _i64: BigInt64Array | null,
    readonly i64: BigInt64Array
}

const TEMP_SIZE = 1024
const _internal: InternalLazy = {
    _u8: null,
    get u8() { return (this._u8 ??= new Uint8Array(TEMP_SIZE)) },
    _u64: null,
    get u64() { return (this._u64 ??= new BigUint64Array(TEMP_SIZE)) },
    _i64: null,
    get i64() { return (this._i64 ??= new BigInt64Array(TEMP_SIZE)) }
}

let _u8: Uint8Array | null = null
const u8 = () => (_u8 ??= new Uint8Array(TEMP_SIZE))

const tempNumbers = new Array<number>(1024).fill(0)

export function toIntArray1<T extends TypedArray>(
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
        i = parseValue(b, i, temp, j)
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

export function toIntArray(
    b: Uint8Array, i: number, maxDigits: number, minValue: number, maxValue: number, ctor: TypedArrayCtors): ConvertResult<TypedArray> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0
        let dc = 0 >>> 0

        while (dc < maxDigits) {
            const d = (b[i] - 48) >>> 0
            if (d > 9) break

            temp = temp * 10 + d
            dc++
            i++
        }

        if (dc > maxDigits || temp < minValue || temp > maxValue)
            throw new Error(`invalid uint8 value ${temp}, must be ${minValue}-${maxValue}`)

        tempNumbers[j] = temp
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    const result = new ctor(j)

    let n = 0
    while (n < result.length) {
        result[n] = tempNumbers[n]
        n++
    }

    return {
        value: result,
        nextIndex: ++i
    }
}

type BigIntArrays = BigInt64Array | BigUint64Array

type ArrayConstructor<T extends BigIntArrays> =
    T extends BigInt64Array ? BigInt64ArrayConstructor :
    T extends BigUint64Array ? BigUint64ArrayConstructor :
    never

export function toBigIntArray<T extends BigIntArrays>(
    b: Uint8Array, i: number, buffer: () => T,
    ctor: ArrayConstructor<T>, parseValue: Parser<T>
): ConvertResult<T> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let temps: T[] | null = null
    const temp = buffer()
    const tempLength = temp.length

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)
        i = parseValue(b, i, temp, j)
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
        return {
            value: new ctor([...temps.flatMap((t) => [...t]), ...temp.slice(0, j)]) as T,
            nextIndex: ++i
        }
    }

    return {
        value: temp.slice(0, j) as T,
        nextIndex: ++i
    }
}

let _i64: BigInt64Array | null = null
const i64 = () => (_i64 ??= new BigInt64Array(TEMP_SIZE))

export function toInt64Array(b: Uint8Array, i: number): ConvertResult<BigInt64Array> {
    return toBigIntArray(b, i, i64, BigInt64Array, parseInt64)
}

let _u64: BigUint64Array | null = null
const u64 = () => (_u64 ??= new BigUint64Array(TEMP_SIZE))

export function toUInt64Array(b: Uint8Array, i: number): ConvertResult<BigUint64Array> {
    return toBigIntArray(b, i, u64, BigUint64Array, parseUint64)
}

export function toF32Array(b: Uint8Array, i: number): ConvertResult<Float32Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const number = parseNumber(b, i, f32Format)
        result[j] = number.value
        i = number.nextIndex
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Float32Array(result),
        nextIndex: i
    }
}

const tempF64 = new Float64Array(1024).fill(0)
export function toF64Array(b: Uint8Array, i: number): ConvertResult<Float64Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const number = parseNumberF64_2(b, i) as { value: number, nextIndex: number }
        tempF64[j] = number.value
        i = number.nextIndex

        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: tempF64.slice(0, j),
        nextIndex: ++i
    }
}
