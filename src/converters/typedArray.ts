import { CollectionMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { f32Format, f64Format, parseNumber, parseNumberU64 } from "../utils/number"
import { TypedArray, TypedArrayCtor } from "../utils/typedArray"
import { COMMA, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { parseNumberF64_2 } from "./number_opt"
import { skipWhitespace } from "./utils"

export function toTypedArray(ctx: ConvertCtx, m: CollectionMeta<TypedArray, TypedArray[number]>, i: number, d: number): ConvertResult<TypedArray> {
    const b = ctx.bytes

    switch (m.type) {
        case 'u8[]': return toIntArray(b, i, 3, 0, 255, Uint8Array)
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

const tempNumbers = new Array<number>(1024).fill(0)

export function toIntArray1(
    b: Uint8Array, i: number, converter: (b: Uint8Array, i: number) => number, ctor: TypedArrayCtor): ConvertResult<TypedArray> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const temp = converter(b, i)

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

export function toIntArray(
    b: Uint8Array, i: number, maxDigits: number, minValue: number, maxValue: number, ctor: TypedArrayCtor): ConvertResult<TypedArray> {
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

const tempInt64 = new BigInt64Array(1024).fill(0n)

const bufferInt = new ArrayBuffer(8)
const conversion32 = new Int32Array(bufferInt)
const conversion64 = new BigInt64Array(bufferInt)
export function toInt64Array(b: Uint8Array, i: number): ConvertResult<BigInt64Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    const MAX_DIGITS = 19
    const MIN_VALUE = -9223372036854775808n
    const MAX_VALUE = 9223372036854775807n

    const MAX_SAFE_INT_DIGITS = 16

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0
        let dc = 0 >>> 0

        while (dc <= MAX_DIGITS) {
            const d = (b[i] - 48) >>> 0
            if (d > 9) break

            dc++
            i++

            if (dc < MAX_SAFE_INT_DIGITS) {
                temp = temp * 10 + d
            }
            else if (dc === MAX_SAFE_INT_DIGITS) {
                const high = Math.floor(temp / 0x100000000)
                const low = (temp) * 10 + temp
                conversion32[0] = low >>> 0
                conversion32[1] = high * 10 + Math.floor(low / 0x100000000)
            }
            else {
                const low = conversion32[0] * 10 + d
                conversion32[0] = low >>> 0
                conversion32[1] = conversion32[1] * 10 + Math.floor(low / 0x100000000)
            }
        }

        if (dc < MAX_SAFE_INT_DIGITS) {
            conversion32[0] = temp >>> 0
            conversion32[1] = Math.floor(temp / 0x100000000)
        }

        const value = conversion64[0]

        if (dc > MAX_DIGITS || value < MIN_VALUE || value > MAX_VALUE)
            throw new Error(`invalid uint64 value ${value}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        tempInt64[j] = value
        j++

        i = skipWhitespace(b, i)
        if (b[i] === COMMA)
            i++
    }

    const result = new BigInt64Array(j)

    let n = 0
    while (n < result.length) {
        result[n] = tempInt64[n]
        n++
    }

    return {
        value: result,
        nextIndex: ++i
    }
}

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

export function toUInt64Array(b: Uint8Array, i: number): ConvertResult<BigUint64Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let temps: BigUint64Array[] | null = null
    const temp = _internal.u64

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        i = parseNumberU64(b, i, temp, j)
        j++

        if (j >= temp.length)
            (temps ??= []).push(temp.slice(0))

        i = skipWhitespace(b, i)

        if (b[i] === COMMA) i++
    }

    if (temps !== null) {
        return {
            value: new BigUint64Array([...temps.flatMap((t) => [...t]), ...temp.slice(0, j)]),
            nextIndex: ++i
        }
    }

    return {
        value: temp.slice(0, j),
        nextIndex: ++i
    }
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
