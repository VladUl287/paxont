import { ConvertCtx, PrimitiveMeta } from "../metadata/types"
import { ReadResult } from "../utils/types"
import { DOUBLE_QUOTE } from "../utils/utf8constants"

export function toString(ctx: ConvertCtx, _m: PrimitiveMeta<string>, i: number, _d: number): ReadResult<string> {
    const b = ctx.bytes

    if (b[i] !== DOUBLE_QUOTE)
        throw new Error(`Expected " at index ${i}, but found '${b[i]}' while parsing string`)
    i++

    let start = i
    i = findNext(b, i, DOUBLE_QUOTE)

    if (i === -1)
        throw new Error(`Unterminated string literal starting at index ${start}: missing closing quote (")`)

    if (ctx.raw) {
        // TODO: find utf16 index
        return {
            value: ctx.raw.substring(start, i),
            nextIndex: ++i
        }
    }

    const count = i - start
    if (count <= MAX_FAST_DECODE) {
        return {
            value: decode(b, start, i),
            nextIndex: ++i
        }
    }

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

const MAX_FAST_DECODE = 24

const TEMP_CACHE = new Array<number[]>(MAX_FAST_DECODE)
for (let i = 1; i <= MAX_FAST_DECODE; i++) {
    TEMP_CACHE[i] = new Array<number>(i).fill(0)
}

function decode(b: Uint8Array, i: number, end: number) {
    const length = end - i
    const result = TEMP_CACHE[length]

    let resultLength = result.length
    let j = 0

    while (i < end) {
        const byte = b[i++]
        if (byte < 0x80) {
            result[j] = byte
        }
        else if (byte < 0xE0) {
            const byte2 = b[i++]
            result[j] = ((byte & 0x1F) << 6) | (byte2 & 0x3F)
            resultLength--
        }
        else if (byte < 0xF0) {
            const byte2 = b[i++]
            const byte3 = b[i++]
            result[j] = (
                ((byte & 0x0F) << 12) |
                ((byte2 & 0x3F) << 6) |
                ((byte3 & 0x3F))
            )
            resultLength -= 2
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
            resultLength -= 2
        }
        j++
    }

    return String.fromCharCode.apply(String, result)
        .substring(0, resultLength)
}
