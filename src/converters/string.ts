import { ConvertCtx, PrimitiveMeta } from "../metadata/types"
import { ReadResult } from "../utils/types"
import { DOUBLE_QUOTE } from "../utils/utf8constants"

export function toString(ctx: ConvertCtx, _m: PrimitiveMeta<string>, i: number, _d: number): ReadResult<string> {
    const b = ctx.bytes

    if (b[i] !== DOUBLE_QUOTE)
        throw new Error(`Expected " at index ${i}, but found '${b[i]}' while parsing string`)
    i++

    let start = i
    // i = findNext(b, i, DOUBLE_QUOTE)
    i += 2048

    if (i === -1)
        throw new Error(`Unterminated string literal starting at index ${start}: missing closing quote (")`)

    // if (ctx.raw) {
    //     // TODO: find utf16 index
    //     return {
    //         value: ctx.raw.substring(start, i),
    //         nextIndex: ++i
    //     }
    // }

    const count = i - start

    return {
        value: decode(b, start, i),
        nextIndex: ++i
    }

    // if (count <= MAX_FAST_DECODE) {
    //     return {
    //         value: decode(b, start, i),
    //         nextIndex: ++i
    //     }
    // }

    const decoder = ctx.options.decoder
    const view = new Uint8Array(b.buffer, start, count)
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
            findNext: (i: number, l: number, s: number) => number
        }

        const module = new WebAssembly.Instance(
            new WebAssembly.Module(
                new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 8, 1, 96, 3, 127, 127, 127, 1, 127, 3, 2, 1, 0, 5, 5, 1, 1, 1, 128, 1, 7, 21, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 8, 102, 105, 110, 100, 78, 101, 120, 116, 0, 0, 10, 156, 1, 1, 153, 1, 3, 1, 127, 2, 123, 1, 127, 32, 0, 33, 3, 32, 2, 253, 15, 33, 4, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 77, 69, 13, 1, 32, 3, 253, 0, 4, 0, 33, 5, 32, 5, 32, 4, 253, 35, 253, 100, 34, 6, 4, 64, 32, 6, 104, 34, 6, 32, 3, 65, 0, 75, 4, 64, 32, 3, 32, 6, 106, 65, 1, 107, 45, 0, 0, 65, 220, 0, 70, 4, 64, 32, 3, 32, 6, 106, 65, 1, 106, 33, 3, 12, 3, 11, 11, 32, 3, 32, 6, 106, 15, 11, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 3, 64, 32, 3, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 3, 45, 0, 0, 32, 2, 70, 4, 64, 32, 3, 15, 11, 32, 3, 65, 1, 106, 33, 3, 12, 0, 11, 65, 127, 11])
            ),
            {},
        )?.exports as WasmModule

        if (module) {
            const memorySetFactory = () => {
                let view = new Uint8Array(module.memory.buffer)
                let ref: Uint8Array | undefined = undefined

                const PAGE_SIZE = 65536
                const MAX_PAGES_COUNT = 128 //(6.4KB)

                const memory = (module: WasmModule, src: Uint8Array) => {
                    if (ref === src)
                        return true

                    const minLength = src.length

                    if (view.length < minLength) {
                        const pages = view.length / PAGE_SIZE
                        const requiredPages = Math.ceil(minLength / PAGE_SIZE)

                        if (requiredPages > MAX_PAGES_COUNT)
                            return false

                        module.memory.grow(requiredPages - pages)
                        view = new Uint8Array(module.memory.buffer)
                    }

                    ref = src
                    view.set(src)
                    return true
                }

                return memory
            }

            const trySetMemory = memorySetFactory()

            return (b: Uint8Array, i: number, s: number) => {
                trySetMemory(module, b)
                return module.findNext(i, b.length, s)
            }
        }

        return findNext1
    } catch (error) {
        console.error('Fallback to JavaScript implementation due:', error)
        return findNext1
    }
}

function findNext1(b: Uint8Array, i: number, s: number): number {
    const mask = s * 0x01010101
    const len = b.length

    while (i < len && (i & 3)) {
        if (b[i] === s) return i
        i++
    }

    const u32 = new Uint32Array(b.buffer, i, Math.floor((len - i) / 4))
    const len32 = u32.length

    let j = 0
    while (j < len32 - 4) {
        const x1 = u32[j] ^ mask
        const x2 = u32[j + 1] ^ mask
        const x3 = u32[j + 2] ^ mask
        const x4 = u32[j + 3] ^ mask

        const c = (x1 & x2 & x3 & x4)
        if ((((c - 0x01010101) ^ c) & 0x80808080) !== 0)
            break

        j += 4
    }

    while (j < len32) {
        const x1 = u32[j] ^ mask

        if ((((x1 - 0x01010101) ^ x1) & 0x80808080) !== 0) {
            i = i + j * 4
            if (b[i] === s) return i
            if (b[++i] === s) return i
            if (b[++i] === s) return i
            if (b[++i] === s) return i
        }

        j++
    }

    i = i + j * 4
    while (i < len) {
        if (b[i] === s) return i
        i++
    }

    return -1
}

const MAX_FAST_DECODE = 128

const TEMP_CACHE = new Array<number[]>(MAX_FAST_DECODE)
for (let i = 1; i <= MAX_FAST_DECODE; i++) {
    TEMP_CACHE[i] = new Array<number>(i).fill(0)
}

function inRangeInclusive(value: number, lowerBound: number, upperBound: number) {
    return (value - lowerBound) <= (upperBound - lowerBound)
}

const u32Conversion = new Uint32Array(1)
const u16Conversion = new Uint16Array(u32Conversion.buffer)

let wasm: any = null
try {
    wasm = new WebAssembly.Instance(
        new WebAssembly.Module(
            new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 8, 1, 96, 3, 127, 127, 127, 1, 127, 3, 2, 1, 0, 5, 5, 1, 1, 1, 128, 1, 7, 22, 2, 2, 117, 56, 2, 0, 13, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 49, 54, 0, 0, 10, 103, 1, 101, 1, 2, 127, 32, 0, 33, 3, 2, 64, 3, 64, 32, 3, 65, 4, 106, 32, 1, 77, 69, 13, 1, 32, 3, 40, 0, 0, 33, 4, 32, 4, 65, 224, 129, 131, 135, 124, 113, 65, 192, 129, 130, 134, 120, 70, 4, 64, 32, 2, 32, 4, 65, 128, 254, 128, 248, 3, 113, 65, 8, 118, 32, 4, 65, 159, 128, 252, 0, 113, 65, 6, 116, 114, 54, 0, 0, 32, 2, 65, 2, 106, 33, 2, 5, 12, 2, 11, 32, 3, 65, 4, 106, 33, 3, 12, 0, 11, 11, 32, 3, 11
            ]),
        ),
        {},
    ).exports
} catch { }

const wasmU8 = new Uint8Array(wasm.u8.buffer)
const wasmU16 = new Uint16Array(wasm.u8.buffer)

let set = -1

function decode(b: Uint8Array, i: number, end: number) {
    // const length = end - i

    // const result = (TEMP_CACHE[length] ??= new Array<number>(length))

    let j = 0

    // while (i < end - 4) {
    //     result[j] = b[i]
    //     result[j + 1] = b[i + 1]
    //     result[j + 2] = b[i + 2]
    //     result[j + 3] = b[i + 3]
    //     i += 4
    //     j += 4
    // }

    // while (i < end) {
    //     result[j] = b[i]
    //     i++
    //     j++
    // }

    // while (i < end - 4) {
    //     const b1 = b[i]
    //     const b2 = b[i + 1]
    //     const b3 = b[i + 2]
    //     const b4 = b[i + 3]

    //     const num2 = (b1 | b2 << 8 | b3 << 16 | b4 << 24) >>> 0

    //     if (((num2 & 0xC0E0C0E0) >>> 0) === 0x80C080C0) {
    //         u32Conversion[j] = ((num2 & 0x3F003F00) >> 8) | ((num2 & 0x1F001F) << 6)

    //         //         // result[j++] = ((b1 & 0x1F) << 6) | (b2 & 0x3F)
    //         //         // result[j++] = ((b3 & 0x1F) << 6) | (b4 & 0x3F)

    //         //         j += 2
    //         //         i += 4
    //         //     }

    //         //     // if (((num2 - 32960) & 0xC0E0) === 0) {
    //         //     //     if (inRangeInclusive(num2 & 0xC0FF0000, 2160197632, 2162098176)) {
    //         //     //         u32Conversion[0] = ((num2 & 0x3F003F00) >> 8) | ((num2 & 0x1F001F) << 6)
    //         //     //         result[j++] = u16Conversion[0]
    //         //     //         result[j++] = u16Conversion[1]
    //         //     //         i += 4
    //         //     //     }
    //     }
    // }

    wasmU8.set(b.subarray(i))

    let index = wasm.utf8_to_utf16(0, b.length, 0)

    const length = (index / 4) + 1
    const result = (TEMP_CACHE[length] ??= new Array<number>(length))

    // while (j < length - 4) {
    //     result[j] = wasmU16[j]
    //     result[j + 1] = wasmU16[j + 1]
    //     result[j + 2] = wasmU16[j + 2]
    //     result[j + 3] = wasmU16[j + 3]
    //     j += 4
    // }

    while (j < length) {
        result[j] = wasmU16[j]
        j++
    }

    return result as any
    // return String.fromCharCode.apply(String, result)

    while (i < end) {
        const byte = b[i++]
        if (byte < 0x80) {
            result[j] = byte
        }
        else if (byte < 0xE0) {
            const byte2 = b[i++]
            result[j] = ((byte & 0x1F) << 6) | (byte2 & 0x3F)
        }
        else if (byte < 0xF0) {
            const byte2 = b[i++]
            const byte3 = b[i++]
            result[j] = (
                ((byte & 0x0F) << 12) |
                ((byte2 & 0x3F) << 6) |
                ((byte3 & 0x3F))
            )
        }
        else {
            const byte2 = b[i++]
            const byte3 = b[i++]
            const byte4 = b[i++]
            const codePoint = (
                ((byte & 0x07) << 18) |
                ((byte2 & 0x3F) << 12) |
                ((byte3 & 0x3F) << 6) |
                (byte4 & 0x3F)
            )
            result[j] = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800
            result[++j] = ((codePoint - 0x10000) % 0x400) + 0xDC00
        }
        j++
    }

    return j as any
    // return String.fromCharCode.apply(String, result)
}
