import { BaseMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { COMMA, CURLY_CLOSE, DOUBLE_QUOTE, DOUBLE_QUOTE as DQ } from "../utils/utf8constants"

let wasm: any = null
try {
    wasm = new WebAssembly.Instance(
        new WebAssembly.Module(
            new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 8, 1, 96, 3, 127, 127, 127, 1, 127, 3, 2, 1, 0, 5, 3, 1, 0, 1, 7, 24, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 11, 105, 110, 100, 101, 120, 79, 102, 83, 105, 109, 100, 0, 0, 10, 115, 1, 113, 3, 1, 127, 2, 123, 1, 127, 32, 2, 253, 15, 33, 4, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 77, 69, 13, 1, 32, 0, 32, 3, 106, 253, 0, 4, 0, 33, 5, 32, 5, 32, 4, 253, 35, 253, 100, 34, 6, 4, 64, 32, 3, 32, 6, 104, 106, 15, 11, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 3, 64, 32, 3, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 0, 32, 3, 106, 45, 0, 0, 32, 2, 70, 4, 64, 32, 3, 15, 11, 32, 3, 65, 1, 106, 33, 3, 12, 0, 11, 65, 127, 11
            ]),
        ),
        {},
    ).exports
} catch { }

const wasmMem = new Uint8Array(wasm.memory.buffer)
const indexOfSimd = wasm.indexOfSimd as Function
let set = false

const MAX_FAST_DECODE = 32

// const reader = new FileReader()
// reader.onload = () => console.log(reader.result)
// reader.readAsText(blob)

export function toString(
    ctx: ConvertCtx, _meta: BaseMeta<string>, i: number, _depth: number): ConvertResult<string> {
    const b = ctx.bytes

    if (b[i] !== DQ)
        throw new Error("")
    i++

    let start = i

    // if (!set) {
    //     wasmMem.set(b)
    //     set = true
    // }

    // const count = indexOfSimd(i, b.length, 34)
    // i += count

    // if (count <= MAX_FAST_DECODE) {
    //     return {
    //         value: decode(b, start, i),
    //         nextIndex: ++i
    //     }
    // }

    // i = findNext1(b, i, DOUBLE_QUOTE)
    // i = findNext2(b, i, DOUBLE_QUOTE)
    i = findNext3(b, i, DOUBLE_QUOTE)

    // if (i === -1) {
    //     i = b.length - 2
    // }

    return {
        // value: i as any,
        // value: b.subarray(1, b.length - 1) as any,
        value: ctx.options.decoder.decode(b.subarray(start, i)),
        // value: i as any,
        nextIndex: ++i
    }
}

function findNext3(b: Uint8Array, i: number, s: number): number {
    const len = b.length
    if (i >= len) return -1

    while (i < len && (i & 3) !== 0) {
        if (b[i] === s) return i
        i++
    }

    const u32length = ((b.byteLength - i) / 4) | 0
    const b32 = new Uint32Array(b.buffer, i, u32length)

    const mask = s * 0x01010101

    let j = 0
    while (j < b32.length - 4) {
        const xa = (b32[j] & b32[j + 1]) ^ mask
        const xb = (b32[j + 2] & b32[j + 3]) ^ mask

        const ta = (xa - 0x01010101) & ~xa
        const tb = (xb - 0x01010101) & ~xb

        if (((ta | tb) & 0x80808080) !== 0)
            break

        j += 4
    }
    i = i + j * 4

    while (i < len && b[i] !== s) i++
    return i
}

function findNext2(b: Uint8Array, i: number, s: number): number {
    const len = b.length
    if (i >= len) return -1

    while (i < len && (i & 3) !== 0) {
        if (b[i] === s) return i
        i++
    }

    const u32length = ((b.byteLength - i) / 4) | 0
    const b32 = new Uint32Array(b.buffer, i, u32length)

    const mask = s * 0x01010101

    let j = 0
    while (j < b32.length - 2) {
        const x = (b32[j] & b32[j + 1]) ^ mask

        if (((x - 0x01010101) & ~x & 0x80808080) !== 0)
            break

        j += 2
    }
    i = i + (j - 2) * 4

    while (i < len && b[i] !== s) i++
    return i
}

function findNext1(b: Uint8Array, i: number, s: number): number {
    while (i < b.length - 8) {
        if (b[i] === s || b[i + 1] === s || b[i + 2] === s || b[i + 3] === s) break
        if (b[i + 4] === s || b[i + 5] === s || b[i + 6] === s || b[i + 7] === s) break
        i += 8
    }

    while (i < b.length - 4) {
        if (b[i] === s || b[i + 1] === s || b[i + 2] === s || b[i + 3] === s) break
        i += 4
    }

    while (i < b.length && b[i] !== s)
        i++

    return -1
}

const TEMP_CACHE = new Array<number[]>(MAX_FAST_DECODE)
for (let i = 1; i <= MAX_FAST_DECODE; i++) {
    TEMP_CACHE[i] = new Array<number>(i).fill(0)
}

function decode(bytes: Uint8Array, start: number, end: number) {
    const length = end - start
    const result = TEMP_CACHE[length]

    let finalLength = result.length
    let j = 0

    while (start < end) {
        const byte = bytes[start++]
        if (byte < 0x80) {
            result[j] = byte
        }
        else if (byte < 0xE0) {
            const byte2 = bytes[start++]
            result[j] = ((byte & 0x1F) << 6) | (byte2 & 0x3F)
            finalLength--
        }
        else if (byte < 0xF0) {
            const byte2 = bytes[start++]
            const byte3 = bytes[start++]
            result[j] = (
                ((byte & 0x0F) << 12) |
                ((byte2 & 0x3F) << 6) |
                ((byte3 & 0x3F))
            )
            finalLength -= 2
        }
        else {
            const byte2 = bytes[start++]
            const byte3 = bytes[start++]
            const byte4 = bytes[start++]
            const codePoint = (
                ((byte & 0x07) << 18) |
                ((byte2 & 0x3F) << 12) |
                ((byte3 & 0x3F) << 6) |
                (byte4 & 0x3F)
            )
            result[j] = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800
            result[++j] = ((codePoint - 0x10000) % 0x400) + 0xDC00
            finalLength -= 2
        }
        j++
    }

    return String.fromCharCode.apply(String, result)
        .substring(0, finalLength)
}
