import { BaseMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { DOUBLE_QUOTE } from "../utils/utf8constants"

export function toString(
    ctx: ConvertCtx, _meta: BaseMeta<string>, i: number, _depth: number): ConvertResult<string> {
    const b = ctx.bytes

    if (b[i] !== DOUBLE_QUOTE)
        throw new Error(`Expected " at index ${i}, but found '${b[i]}' while parsing string`)
    i++

    let start = i
    i = findNext(b, i, DOUBLE_QUOTE)

    const count = i - start
    if (count <= MAX_FAST_DECODE) {
        return {
            value: decode(b, start, i),
            nextIndex: ++i
        }
    }

    const decoder = ctx.options.decoder
    const view = new Uint8Array(b.buffer, start, i - start)
    return {
        value: decoder.decode(view),
        nextIndex: ++i
    }
}

const findNext = findNextFactory()

function findNextFactory(): (b: Uint8Array, i: number, s: number) => number {
    try {
        type WasmModule = {
            memory: WebAssembly.Memory,
            findNext: (i: number, length: number, symbol: number) => number
        }

        const wasm = new WebAssembly.Instance(
            new WebAssembly.Module(
                new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 8, 1, 96, 3, 127, 127, 127, 1, 127, 3, 2, 1, 0, 5, 4, 1, 1, 1, 100, 7, 21, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 8, 102, 105, 110, 100, 78, 101, 120, 116, 0, 0, 10, 115, 1, 113, 3, 1, 127, 2, 123, 1, 127, 32, 2, 253, 15, 33, 4, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 77, 69, 13, 1, 32, 0, 32, 3, 106, 253, 0, 4, 0, 33, 5, 32, 5, 32, 4, 253, 35, 253, 100, 34, 6, 4, 64, 32, 3, 32, 6, 104, 106, 15, 11, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 3, 64, 32, 3, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 0, 32, 3, 106, 45, 0, 0, 32, 2, 70, 4, 64, 32, 3, 15, 11, 32, 3, 65, 1, 106, 33, 3, 12, 0, 11, 65, 127, 11]),
            ), {},
        )?.exports as WasmModule

        if (wasm) {
            let u8Wasm = new Uint8Array(wasm.memory.buffer)

            const u8Resolver = (minLength: number) => {
                if (u8Wasm.byteLength < minLength) {
                    const PAGE_SIZE = 65536
                    const MAX_PAGES_COUNT = 100 //(6.4MB)

                    const currentPages = u8Wasm.byteLength / PAGE_SIZE
                    const neededPages = Math.ceil(minLength / PAGE_SIZE)

                    if (neededPages > MAX_PAGES_COUNT) {
                        //partially decode
                    }

                    wasm.memory.grow(neededPages - currentPages)
                    u8Wasm = new Uint8Array(wasm.memory.buffer)
                }
                return u8Wasm
            }

            return (b: Uint8Array, i: number, s: number) => {
                const u8 = u8Resolver(b.length)
                u8.set(b)
                return wasm.findNext(i, b.length, DOUBLE_QUOTE)
            }
        }

        return findNext1
    } catch (error) {
        console.error('Fallback to JavaScript implementation due:', error)
        return findNext1
    }
}

function findNext1(u8: Uint8Array, i: number, s: number): number {
    const mask = s * 0x01010101

    const u32 = new Uint32Array(u8.buffer, i)

    let j = Math.floor(i / 4) + 1

    const len32 = Math.floor(u8.length / 4)

    while (j < len32 - 8) {
        const x1 = u32[j] ^ mask
        const x2 = u32[j + 1] ^ mask
        const x3 = u32[j + 2] ^ mask
        const x4 = u32[j + 3] ^ mask
        const x5 = u32[j + 4] ^ mask
        const x6 = u32[j + 5] ^ mask
        const x7 = u32[j + 6] ^ mask
        const x8 = u32[j + 7] ^ mask

        const c = (x1 & x2 & x3 & x4 & x5 & x6 & x7 & x8)
        if ((((c - 0x01010101) ^ c) & 0x80808080) !== 0)
            break

        j += 8
    }

    while (j < u32.length) {
        const x1 = u32[j] ^ mask

        const c = ((x1 - 0x01010101) ^ x1) & 0x80808080
        if (c !== 0) {
            i = j * 4

            if (u8[i] === s) return i
            if (u8[++i] === s) return i
            if (u8[++i] === s) return i
            if (u8[++i] === s) return i
        }

        j++
    }

    return u8.length
}

const MAX_FAST_DECODE = 32

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
