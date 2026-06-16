import { BaseMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { COMMA, CURLY_CLOSE, DOUBLE_QUOTE as DQ } from "../utils/utf8constants"

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

export function toString(
    ctx: ConvertCtx, _meta: BaseMeta<string>, i: number, _depth: number): ConvertResult<string> {
    const b = ctx.bytes

    if (b[i] !== DQ)
        throw new Error("")
    i++

    let start = i

    if (!set) {
        wasmMem.set(b)
        set = true
    }

    const count = indexOfSimd(i, b.length, 34)
    i += count

    if (count <= MAX_FAST_DECODE) {
        return {
            value: decode(b, start, i),
            nextIndex: ++i
        }
    }

    return {
        value: ctx.options.decoder.decode(b.subarray(start, i)),
        nextIndex: ++i
    }
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

    try {
        result.length = finalLength
        return String.fromCharCode.apply(String, result)
    } finally {
        result.length = length
    }
}
