import { BaseMeta, ConvertCtx, isObjectFieldMeta } from "../metadata/types"
import { isDigitU8 } from "../utils/utf8constants"
import { ConvertResult } from "./types"

export function toBigInt(ctx: ConvertCtx, meta: BaseMeta<bigint>, index: number, _depth: number): ConvertResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let start = index
    let i = index

    while (i < len - 4) {
        const a1 = b[i]
        const a2 = b[i + 1]
        const a3 = b[i + 2]
        const a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        i += 4
    }

    while (i < len && isDigitU8(b[i])) i++

    const segment = b.subarray(start, i)
    const segmentStr = ctx.options.decoder.decode(segment)
    return {
        value: BigInt(segmentStr),
        nextIndex: i
    }
}

const bufferConversion = new ArrayBuffer(120)
const conversionU32 = new Uint32Array(bufferConversion)
const conversionU64 = new BigUint64Array(bufferConversion)

const MAX_SAFE_INT_DIGITS = 16

const POW10 = [1]
const POW10N = [1n]
for (let i = 1; i <= 308; i++) {
    POW10[i] = POW10[i - 1] * 10
    POW10N[i] = POW10N[i - 1] * 10n
}

export function toBigInt1(ctx: ConvertCtx, _meta: BaseMeta<bigint>, index: number, _depth: number): ConvertResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let i = index
    let temp = 0
    let dc = 0
    let j = 0

    while (i < len - 4) {
        const a1 = b[i]
        const a2 = b[i + 1]
        const a3 = b[i + 2]
        const a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        const chunk = ((a1 & 0x0F) * 1000) + ((a2 & 0x0F) * 100) + ((a3 & 0x0F) * 10) + (a4 & 0x0F)

        dc += 4

        if (dc < MAX_SAFE_INT_DIGITS) {
            temp = temp * 10000 + chunk
        }
        else {
            let high = Math.floor(temp / 0x100000000)
            let low = (temp >>> 0) * 10000 + chunk
            conversionU32[j] = low >>> 0
            conversionU32[j + 1] = high * 10000 + Math.floor(low / 0x100000000)

            temp = 0
            dc = 0

            if (isDigitU8(b[i])) temp = temp * 10 + (b[i] & 0x0F); dc++
            if (isDigitU8(b[i + 1])) temp = temp * 10 + (b[i + 1] & 0x0F); dc++
            if (isDigitU8(b[i + 2])) temp = temp * 10 + (b[i + 2] & 0x0F); dc++

            low = conversionU32[j] * POW10[dc] + temp
            conversionU32[j] = low >>> 0
            conversionU32[j + 1] = conversionU32[j + 1] * POW10[dc] + Math.floor(low / 0x100000000)

            temp = 0
            dc = 0
            j++
        }

        i += 4
    }

    const result = combine(conversionU64, 0, j / 2)

    return {
        value: result,
        nextIndex: i
    }
}

const c = new Float64Array(new ArrayBuffer(120))
export function toBigInt2(ctx: ConvertCtx, _meta: BaseMeta<bigint>, index: number, _depth: number): ConvertResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let i = index
    let temp = 0
    let dc = 0
    let j = 0

    while (i < len - 4) {
        const a1 = b[i]
        const a2 = b[i + 1]
        const a3 = b[i + 2]
        const a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        const chunk = ((a1 & 0x0F) * 1000) + ((a2 & 0x0F) * 100) + ((a3 & 0x0F) * 10) + (a4 & 0x0F)

        dc += 4

        if (dc < MAX_SAFE_INT_DIGITS) {
            temp = temp * 10000 + chunk
        }
        else {
            c[j] = temp
            temp = 0
            dc = 0
            j++
        }

        i += 4
    }

    return {
        value: BigInt(`${c[0]}${c[1]}${c[2]}${c[3]}${c[4]}${c[5]}${c[6]}${c[7]}${c[8]}${c[9]}${c[10]}${c[11]}`),
        nextIndex: i
    }
}

const symbols = new Array<number>(20).fill(0)
export function toBigInt3(ctx: ConvertCtx, _meta: BaseMeta<bigint>, index: number, _depth: number): ConvertResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let i = index
    let j = 0

    while (i < len - 4) {
        const a1 = b[i]
        const a2 = b[i + 1]
        const a3 = b[i + 2]
        const a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        symbols[j] = a1
        symbols[j + 1] = a2
        symbols[j + 2] = a3
        symbols[j + 3] = a4

        i += 4
        j += 4
    }

    const bigStr = String.fromCharCode.apply(String, symbols)
    return {
        value: BigInt(bigStr),
        nextIndex: i
    }
}

function combine(arr: BigUint64Array, start: number, end: number): bigint {
    if (start === end)
        return arr[start]

    const mid = Math.floor((start + end) / 2)
    const left = combine(arr, start, mid)
    const right = combine(arr, mid + 1, end)

    const count = 19 * (end - mid)

    return left * POW10N[count] + right
}


