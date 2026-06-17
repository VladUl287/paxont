import { CollectionMeta, ConvertCtx } from "../metadata/types"
import { f32Format, f64Format, parseNumber } from "../utils/number"
import { TypedArray } from "../utils/typedArray"
import { COMMA, MINUS, SQUARE_CLOSE, SQUARE_OPEN } from "../utils/utf8constants"
import { ConvertResult } from "./types"
import { skipWhitespace } from "./utils"

export function toTypedArray(ctx: ConvertCtx, m: CollectionMeta<TypedArray, TypedArray[number]>, i: number, d: number): ConvertResult<TypedArray> {
    const b = ctx.bytes

    switch (m.type) {
        case 'u8': return toU8Array(b, i)
        case 'u16': return toU16Array(b, i)
        case 'u32': return toU32Array(b, i)
        case 'u64': return toU64Array(b, i)
        case 'i8': return toI8Array(b, i)
        case 'i16': return toI16Array(b, i)
        case 'i32': return toI32Array(b, i)
        case 'i64': return toI64Array(b, i)
        case 'f32': return toU8Array(b, i)
        case 'f64': return toU8Array(b, i)
        default:
            throw new Error(`not typed array '${m.type}'`)
    }
}

export function toU8Array(b: Uint8Array, i: number): ConvertResult<Uint8Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    const MAX_DIGITS = 3
    const MIN_VALUE = 0
    const MAX_VALUE = 255

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0 >>> 0
        let dc = 0 >>> 0

        const d1 = (b[i] - 48) >>> 0
        const d2 = (b[i] - 48) >>> 0
        const d3 = (b[i] - 48) >>> 0

        if (d1 <= 9) temp = temp * 10 + d1; dc++
        if (d2 <= 9) temp = temp * 10 + d2; dc++
        if (d3 <= 9) temp = temp * 10 + d3; dc++

        if (dc >= MAX_DIGITS || temp < MIN_VALUE || temp > MAX_VALUE)
            throw new Error(`invalid uint8 value ${temp}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = temp
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Uint8Array(result),
        nextIndex: i
    }
}

export function toU16Array(b: Uint8Array, i: number): ConvertResult<Uint16Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    const MAX_DIGITS = 5
    const MIN_VALUE = 0
    const MAX_VALUE = 65535

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0 >>> 0
        let dc = 0 >>> 0

        const d1 = (b[i] - 48) >>> 0
        const d2 = (b[i] - 48) >>> 0
        const d3 = (b[i] - 48) >>> 0
        const d4 = (b[i] - 48) >>> 0
        const d5 = (b[i] - 48) >>> 0

        if (d1 <= 9) temp = temp * 10 + d1; dc++
        if (d2 <= 9) temp = temp * 10 + d2; dc++
        if (d3 <= 9) temp = temp * 10 + d3; dc++
        if (d4 <= 9) temp = temp * 10 + d4; dc++
        if (d5 <= 9) temp = temp * 10 + d5; dc++

        if (dc >= MAX_DIGITS || temp < MIN_VALUE || temp > MAX_VALUE)
            throw new Error(`invalid uint8 value ${temp}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = temp
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Uint16Array(result),
        nextIndex: i
    }
}

export function toU32Array(b: Uint8Array, i: number): ConvertResult<Uint32Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    const MAX_DIGITS = 10
    const MIN_VALUE = 0
    const MAX_VALUE = 4294967295

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0
        let dc = 0 >>> 0

        while (dc < MAX_DIGITS) {
            const d = (b[i] - 48) >>> 0
            if (d > 9) break
            temp = temp * 10 + d
            dc++
            i++
        }

        if (dc >= MAX_DIGITS || temp < MIN_VALUE || temp > MAX_VALUE)
            throw new Error(`invalid uint8 value ${temp}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = temp
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Uint32Array(result),
        nextIndex: ++i
    }
}

const bufferUInt = new ArrayBuffer(8)
const conversionU32 = new Uint32Array(bufferUInt)
const conversionU64 = new BigUint64Array(bufferUInt)
export function toU64Array(b: Uint8Array, i: number): ConvertResult<BigUint64Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<bigint>()

    const MAX_DIGITS = 20
    const MIN_VALUE = 0n
    const MAX_VALUE = 18446744073709551615n

    const MAX_SAFE_INT_DIGITS = 16
    const MAX_SAFE_LONG_DIGITS = 19

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
                conversionU32[0] = low >>> 0
                conversionU32[1] = high * 10 + Math.floor(low / 0x100000000)
            }
            else {
                const low = conversionU32[0] * 10 + d
                conversionU32[0] = low >>> 0
                conversionU32[1] = conversionU32[1] * 10 + Math.floor(low / 0x100000000)
            }
        }

        if (dc < MAX_SAFE_INT_DIGITS) {
            conversionU32[0] = temp >>> 0
            conversionU32[1] = Math.floor(temp / 0x100000000)
        }

        const value = conversionU64[0]

        if (dc > MAX_SAFE_LONG_DIGITS && value > MAX_VALUE)
            throw new Error(`invalid uint64 value ${value}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = value
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new BigUint64Array(result),
        nextIndex: i
    }
}

export function toI8Array(b: Uint8Array, i: number): ConvertResult<Int8Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    const MAX_DIGITS = 3
    const MIN_VALUE = -128
    const MAX_VALUE = 127

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0 >>> 0
        let dc = 0 >>> 0

        let sign = 1
        if (b[i] === MINUS) {
            sign = -1
            i++
        }

        const d1 = (b[i] - 48) >>> 0
        const d2 = (b[i] - 48) >>> 0
        const d3 = (b[i] - 48) >>> 0

        if (d1 <= 9) temp = temp * 10 + d1; dc++
        if (d2 <= 9) temp = temp * 10 + d2; dc++
        if (d3 <= 9) temp = temp * 10 + d3; dc++

        temp *= sign

        if (dc > MAX_DIGITS || temp < MIN_VALUE || temp > MAX_VALUE)
            throw new Error(`invalid int8 value ${temp}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = temp
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Int8Array(result),
        nextIndex: i
    }
}

export function toI16Array(b: Uint8Array, i: number): ConvertResult<Int16Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    const MAX_DIGITS = 5
    const MIN_VALUE = -32768
    const MAX_VALUE = 32767

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0 >>> 0
        let dc = 0 >>> 0

        let sign = 1
        if (b[i] === MINUS) {
            sign = -1
            i++
        }

        const d1 = (b[i] - 48) >>> 0
        const d2 = (b[i] - 48) >>> 0
        const d3 = (b[i] - 48) >>> 0
        const d4 = (b[i] - 48) >>> 0
        const d5 = (b[i] - 48) >>> 0

        if (d1 <= 9) temp = temp * 10 + d1; dc++
        if (d2 <= 9) temp = temp * 10 + d2; dc++
        if (d3 <= 9) temp = temp * 10 + d3; dc++
        if (d4 <= 9) temp = temp * 10 + d4; dc++
        if (d5 <= 9) temp = temp * 10 + d5; dc++

        temp *= sign

        if (dc > MAX_DIGITS || temp < MIN_VALUE || temp > MAX_VALUE)
            throw new Error(`invalid int16 value ${temp}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = temp
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Int16Array(result),
        nextIndex: i
    }
}

export function toI32Array(b: Uint8Array, i: number): ConvertResult<Int32Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    const MAX_DIGITS = 10
    const MIN_VALUE = 0
    const MAX_VALUE = 4294967295

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        let temp = 0
        let dc = 0 >>> 0

        const d1 = (b[i] - 48) >>> 0
        const d2 = (b[i] - 48) >>> 0
        const d3 = (b[i] - 48) >>> 0
        const d4 = (b[i] - 48) >>> 0
        const d5 = (b[i] - 48) >>> 0
        const d6 = (b[i] - 48) >>> 0
        const d7 = (b[i] - 48) >>> 0
        const d8 = (b[i] - 48) >>> 0
        const d9 = (b[i] - 48) >>> 0
        const d10 = (b[i] - 48) >>> 0

        if (d1 <= 9) temp = temp * 10 + d1; dc++
        if (d2 <= 9) temp = temp * 10 + d2; dc++
        if (d3 <= 9) temp = temp * 10 + d3; dc++
        if (d4 <= 9) temp = temp * 10 + d4; dc++
        if (d5 <= 9) temp = temp * 10 + d5; dc++
        if (d6 <= 9) temp = temp * 10 + d6; dc++
        if (d7 <= 9) temp = temp * 10 + d7; dc++
        if (d8 <= 9) temp = temp * 10 + d8; dc++
        if (d9 <= 9) temp = temp * 10 + d9; dc++
        if (d10 <= 9) temp = temp * 10 + d10; dc++

        if (dc >= MAX_DIGITS || temp < MIN_VALUE || temp > MAX_VALUE)
            throw new Error(`invalid uint8 value ${temp}, must be ${MIN_VALUE}-${MAX_VALUE}`)

        result[j] = temp
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Int32Array(result),
        nextIndex: i
    }
}

const bufferInt = new ArrayBuffer(8)
const conversion32 = new Int32Array(bufferInt)
const conversion64 = new BigInt64Array(bufferInt)
export function toI64Array(b: Uint8Array, i: number): ConvertResult<BigInt64Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<bigint>()

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

        result[j] = value
        i += dc
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new BigInt64Array(result),
        nextIndex: i
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

export function toF64Array(b: Uint8Array, i: number): ConvertResult<Float64Array> {
    if (b[i] !== SQUARE_OPEN)
        throw new Error(`array open not found at position ${i}`)
    i++

    let result = new Array<number>()

    let j = 0
    while (b[i] !== SQUARE_CLOSE) {
        i = skipWhitespace(b, i)

        const number = parseNumber(b, i, f64Format)
        result[j] = number.value
        i = number.nextIndex
        j++

        i = skipWhitespace(b, i)

        if (b[i] === COMMA)
            i++
    }

    return {
        value: new Float64Array(result),
        nextIndex: i
    }
}
