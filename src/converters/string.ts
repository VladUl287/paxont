import { genUnrolledFromCharCode, genUnrolledFromCharCode16 as genUnrolledFromCharCode16LE } from "../code_gen/string"
import { JsonParsingContext, PrimitiveMeta } from "../metadata/types"
import { CURRENT_PLATFORM, isBun, isNode } from "../utils/platform"
import { ReadResult, ReadResultType } from "../utils/types"
import { BACKSLASH, DOUBLE_QUOTE, DOUBLE_QUOTE as DQ, E } from "../utils/ascii_symbols"
import { JSONParseError } from "../utils/error"
import { wasmInstance } from "../utils/wasm"

const factories = new Array<(data: ArrayLike<number>, i: number) => string>(32)
factories[0] = (_a, _i) => ""
const factories16 = new Array<(data: ArrayLike<number>, i: number) => string>(32)
factories16[0] = (_a, _i) => ""

export const defaultParseOptions: ParserOptions = {
    initialWasmMemoryPages: 1, //~64KiB
    maxWasmMemoryPages: 128, //~8MiB,
    useUtf16: isNode(CURRENT_PLATFORM) || isBun(CURRENT_PLATFORM),

    wasmInstance,

    newUtf16: isNode(CURRENT_PLATFORM) || isBun(CURRENT_PLATFORM) ?
        (bytes: Uint8Array) => {
            const buffer = Buffer.from(bytes.buffer)
            return (start, end) => {
                const length = end - start
                if (length <= 64) {
                    const factory = (factories[length / 2] ??= genUnrolledFromCharCode16LE(length))
                    return factory(buffer, start)
                }
                return buffer.toString('utf16le', start, end)
            }
        } :
        (bytes: Uint8Array) => {
            const unsafeDecoder16 = new TextDecoder('utf-16le', { fatal: false })
            return (start, end) => {
                const length = end - start
                if (length <= 64) {
                    const factory = (factories[length / 2] ??= genUnrolledFromCharCode16LE(length))
                    return factory(bytes, start)
                }
                return unsafeDecoder16.decode(new Uint8Array(bytes.buffer, start, end - start))
            }
        },

    newUtf8: isNode(CURRENT_PLATFORM) || isBun(CURRENT_PLATFORM) ?
        (bytes: Uint8Array) => {
            const buffer = Buffer.from(bytes.buffer)
            return (start, end, ascii_only = false) => {
                const length = end - start
                if (ascii_only && length <= 32) {
                    const factory = (factories[length] ??= genUnrolledFromCharCode(length))
                    return factory(buffer, start)
                }
                return buffer.toString('utf8', start, end)
            }
        } :
        (bytes: Uint8Array) => {
            const unsafeDecoder8 = new TextDecoder('utf-8', { fatal: false })
            return (start, end, ascii_only = false) => {
                const length = end - start
                if (ascii_only && length <= 32) {
                    const factory = (factories[length] ??= genUnrolledFromCharCode(length))
                    return factory(bytes, start)
                }
                return unsafeDecoder8.decode(new Uint8Array(bytes.buffer, start, end - start))
            }
        }
}

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

type UTF8Module = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly dq_index: () => number
    readonly utf8_to_utf8: (start: number, length: number, partial: number) => number
}

type UTF16Module = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly dq_index: () => number
    readonly utf16_length: () => number
    readonly utf8_to_utf16: (start: number, length: number, target: number, partial: number) => number
}

type ParserOptions = {
    readonly wasmInstance: typeof wasmInstance
    readonly maxWasmMemoryPages: number
    readonly initialWasmMemoryPages: number
    readonly useUtf16: boolean,
    readonly newUtf16: (bytes: Uint8Array) => (start: number, end: number, ascii_only?: boolean) => string,
    readonly newUtf8: (bytes: Uint8Array) => (start: number, end: number, ascii_only?: boolean) => string
}

export function createStringParser(options: ParserOptions) {
    const { initialWasmMemoryPages, maxWasmMemoryPages, newUtf8, newUtf16, wasmInstance } = options

    const memory = new WebAssembly.Memory({
        initial: initialWasmMemoryPages,
        maximum: maxWasmMemoryPages
    })

    let memoryView = new Uint8Array(memory.buffer)
    let utf16 = newUtf16(memoryView)
    let utf8 = newUtf8(memoryView)

    let setted: Uint8Array | undefined = undefined
    let settedStart: number = 0

    function setView(m: WebAssembly.Memory) {
        memoryView = new Uint8Array(m.buffer)
        utf16 = newUtf16(memoryView)
        utf8 = newUtf8(memoryView)
    }

    const PAGE_SIZE_BYTES = Math.ceil(memory.buffer.byteLength / initialWasmMemoryPages)
    const MAX_MEMORY = PAGE_SIZE_BYTES * maxWasmMemoryPages

    const decoderFactory = (opt: ParserOptions) => {
        const decodeFromString = (base: string, { reader, stack }: JsonParsingContext, i: number): ReadResult<string> => {
            const { bytes: b, bytesLength: length, writable, raw, sparseIndex } = reader

            if (!raw) {
                return {
                    type: ERROR,
                    error: new JSONParseError("")
                }
            }

            const ascii_only = raw.length === length //check if we aligned with previous parsing

            if (ascii_only) {
                let j = i

                while (j <= b.length - 4) {
                    const word = (b[j] | b[j + 1] << 8 | b[j + 2] << 16 | b[j + 3] << 24) ^ 0x22222222

                    if (((word - 0x01010101) & (~word) & 0x80808080) !== 0) {
                        break
                    }

                    j += 4
                }

                while (raw[j] !== '"') {
                    j++
                }

                return {
                    type: COMPLETE,
                    value: raw.substring(i, j),
                    nextIndex: j + 1
                }
            }

            let charIndex = sparseIndex?.charIndex ?? 0
            let byteIndex = sparseIndex?.byteIndex ?? 0

            while (byteIndex <= i - 8) {
                const word1 = b[byteIndex] | b[byteIndex + 1] << 8 | b[byteIndex + 2] << 16 | b[byteIndex + 3] << 24
                const word2 = b[byteIndex + 4] | b[byteIndex + 5] << 8 | b[byteIndex + 6] << 16 | b[byteIndex + 7] << 24

                const contCount1 = ((word1 & 0x80808080) * 0x01010101) >>> 24
                const contCount2 = ((word2 & 0x80808080) * 0x01010101) >>> 24

                charIndex += 8 - contCount1 + contCount2
                byteIndex += 8
            }

            while (byteIndex < i) {
                if ((b[byteIndex++] & 192) !== 128) {
                    charIndex++
                }
            }

            const startIndex = charIndex

            while (byteIndex <= b.length - 4) {
                const word = (b[byteIndex] | b[byteIndex + 1] << 8 | b[byteIndex + 2] << 16 | b[byteIndex + 3] << 24)

                const xor = word ^ 0x22222222
                if (((xor - 0x01010101) & (~xor) & 0x80808080) !== 0) {
                    break
                }

                const contCount = ((word & 0x80808080) * 0x01010101) >>> 24
                charIndex += 4 - contCount
                byteIndex += 4
            }

            while (b[byteIndex] !== DOUBLE_QUOTE) {
                if ((b[byteIndex++] & 192) !== 128) {
                    charIndex++
                }
            }

            if (reader.sparseIndex) {
                reader.sparseIndex.charIndex = charIndex
                reader.sparseIndex.byteIndex = byteIndex
            }

            const result = raw.substring(startIndex, charIndex)
            return {
                type: COMPLETE,
                value: result,
                nextIndex: byteIndex + 1
            }
        }

        if (opt.useUtf16) {
            const utf16Module = wasmInstance<UTF16Module>(new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 42, 7, 96, 0, 1, 127, 96, 4, 127, 127, 127, 127, 1, 127, 96, 3, 127, 127, 127, 0, 96, 1, 123, 1, 123, 96, 3, 127, 127, 127, 1, 127, 96, 2, 127, 127, 1, 127, 96, 1, 127, 1, 127, 2, 17, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 3, 15, 14, 0, 0, 0, 1, 2, 3, 4, 5, 5, 6, 6, 6, 6, 4, 6, 16, 3, 127, 1, 65, 0, 11, 127, 1, 65, 127, 11, 127, 1, 65, 0, 11, 7, 65, 5, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 0, 8, 100, 113, 95, 105, 110, 100, 101, 120, 0, 1, 12, 117, 116, 102, 49, 54, 95, 108, 101, 110, 103, 116, 104, 0, 2, 13, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 49, 54, 0, 3, 10, 220, 15, 14, 4, 0, 35, 0, 11, 4, 0, 35, 1, 11, 4, 0, 35, 2, 11, 168, 7, 3, 2, 127, 2, 123, 2, 127, 65, 34, 253, 15, 33, 7, 65, 127, 36, 1, 65, 0, 36, 0, 65, 0, 36, 2, 32, 0, 32, 1, 65, 127, 16, 6, 34, 5, 32, 0, 75, 4, 64, 35, 1, 65, 0, 78, 4, 64, 65, 1, 36, 0, 35, 1, 15, 11, 32, 5, 32, 1, 70, 4, 64, 65, 1, 36, 0, 32, 5, 15, 11, 32, 0, 32, 5, 32, 2, 16, 4, 32, 2, 32, 5, 32, 0, 107, 65, 1, 116, 106, 33, 2, 32, 5, 33, 0, 11, 2, 64, 3, 64, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 0, 32, 1, 32, 2, 16, 6, 33, 5, 32, 2, 32, 5, 32, 0, 107, 65, 1, 116, 106, 33, 2, 32, 5, 33, 0, 35, 1, 65, 0, 78, 4, 64, 32, 2, 36, 2, 35, 1, 15, 11, 11, 32, 0, 45, 0, 0, 34, 5, 65, 224, 1, 73, 4, 64, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 6, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 8, 32, 8, 65, 255, 255, 3, 70, 4, 64, 32, 2, 32, 6, 16, 5, 253, 11, 4, 0, 32, 0, 65, 16, 106, 33, 0, 32, 2, 65, 16, 106, 33, 2, 12, 2, 11, 32, 2, 32, 6, 16, 5, 253, 11, 4, 0, 32, 8, 65, 255, 255, 3, 115, 104, 33, 9, 32, 0, 32, 9, 106, 33, 0, 32, 2, 32, 9, 106, 33, 2, 12, 4, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 32, 0, 40, 0, 0, 33, 4, 32, 4, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 70, 69, 13, 1, 32, 4, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 13, 4, 64, 32, 2, 32, 4, 16, 10, 54, 2, 0, 32, 0, 65, 4, 106, 33, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 40, 0, 0, 33, 4, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 12, 1, 11, 32, 2, 32, 4, 16, 9, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 3, 11, 11, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 1, 32, 0, 40, 0, 0, 33, 4, 32, 4, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 4, 65, 143, 192, 0, 113, 69, 32, 4, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 2, 32, 4, 16, 11, 54, 2, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 2, 11, 11, 32, 4, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 4, 65, 255, 255, 3, 113, 65, 8, 16, 8, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 13, 4, 64, 32, 2, 32, 4, 16, 12, 54, 2, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 32, 3, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 0, 15, 5, 65, 127, 15, 11, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 34, 5, 65, 128, 1, 73, 4, 64, 32, 5, 65, 34, 70, 4, 64, 32, 0, 32, 0, 16, 7, 34, 5, 65, 0, 79, 4, 64, 32, 2, 36, 2, 32, 5, 15, 11, 11, 32, 2, 32, 5, 59, 1, 0, 32, 0, 65, 1, 106, 33, 0, 32, 2, 65, 2, 106, 33, 2, 12, 1, 11, 32, 5, 65, 194, 1, 107, 33, 5, 32, 5, 65, 30, 73, 4, 64, 32, 0, 65, 1, 106, 32, 1, 79, 4, 64, 32, 2, 36, 2, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 4, 64, 65, 127, 15, 11, 32, 2, 32, 5, 65, 31, 113, 65, 6, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 1, 11, 32, 5, 65, 46, 73, 4, 64, 32, 0, 65, 2, 106, 32, 1, 79, 4, 64, 32, 2, 36, 2, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 32, 0, 65, 2, 106, 45, 0, 0, 65, 191, 1, 75, 114, 4, 64, 65, 127, 15, 11, 32, 2, 32, 5, 65, 15, 113, 65, 12, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 0, 65, 2, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 1, 11, 11, 11, 32, 3, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 2, 36, 2, 32, 0, 15, 11, 65, 127, 15, 11, 127, 2, 1, 127, 1, 123, 65, 0, 33, 3, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 75, 13, 1, 32, 0, 32, 3, 106, 253, 0, 4, 0, 33, 4, 32, 2, 32, 4, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 2, 32, 4, 253, 138, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 2, 64, 3, 64, 32, 3, 65, 1, 106, 32, 1, 75, 13, 1, 32, 2, 32, 0, 32, 3, 106, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 12, 0, 11, 11, 11, 76, 1, 2, 123, 32, 0, 253, 12, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 253, 78, 33, 1, 32, 1, 65, 6, 253, 139, 1, 33, 1, 32, 0, 65, 8, 253, 141, 1, 33, 2, 32, 2, 253, 12, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 253, 78, 33, 2, 32, 1, 32, 2, 253, 80, 11, 225, 3, 2, 4, 127, 3, 123, 65, 128, 1, 253, 15, 33, 8, 65, 34, 253, 15, 33, 9, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 7, 65, 0, 253, 15, 253, 43, 253, 100, 33, 6, 32, 6, 65, 255, 255, 3, 115, 104, 33, 5, 32, 5, 65, 32, 70, 4, 64, 65, 16, 33, 4, 5, 32, 5, 33, 4, 11, 32, 7, 32, 9, 253, 35, 253, 100, 4, 64, 32, 0, 32, 0, 32, 4, 106, 16, 7, 34, 3, 65, 0, 78, 4, 64, 32, 0, 32, 3, 107, 33, 4, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 7, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 32, 7, 253, 138, 1, 253, 11, 4, 0, 32, 2, 32, 4, 65, 1, 116, 106, 33, 2, 11, 32, 3, 15, 11, 11, 32, 4, 69, 4, 64, 32, 0, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 7, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 32, 7, 253, 138, 1, 253, 11, 4, 0, 32, 2, 32, 4, 65, 1, 116, 106, 33, 2, 11, 32, 0, 32, 4, 106, 33, 0, 32, 4, 65, 16, 70, 13, 1, 32, 0, 15, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 128, 129, 130, 132, 120, 113, 65, 0, 70, 4, 64, 32, 0, 32, 0, 65, 4, 106, 16, 7, 34, 3, 65, 0, 74, 4, 64, 32, 2, 65, 127, 74, 4, 64, 32, 6, 253, 17, 33, 7, 32, 7, 253, 137, 1, 33, 7, 32, 2, 32, 7, 253, 91, 3, 0, 0, 32, 2, 65, 8, 106, 33, 2, 11, 32, 3, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 6, 253, 17, 33, 7, 32, 7, 253, 137, 1, 33, 7, 32, 2, 32, 7, 253, 91, 3, 0, 0, 32, 2, 65, 8, 106, 33, 2, 11, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 6, 32, 6, 65, 128, 1, 79, 4, 64, 32, 0, 15, 11, 32, 6, 65, 34, 70, 32, 0, 32, 0, 16, 7, 34, 3, 65, 0, 74, 113, 4, 64, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 6, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 11, 32, 3, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 6, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 15, 11, 11, 32, 0, 15, 11, 107, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 36, 1, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 15, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 1, 107, 116, 114, 11, 30, 0, 32, 0, 65, 8, 118, 65, 255, 1, 113, 32, 0, 65, 255, 1, 113, 65, 6, 116, 106, 65, 128, 224, 0, 107, 65, 128, 1, 107, 11, 26, 0, 32, 0, 65, 128, 254, 128, 248, 3, 113, 65, 8, 118, 32, 0, 65, 159, 128, 252, 0, 113, 65, 6, 116, 114, 11, 33, 0, 32, 0, 65, 128, 128, 252, 1, 113, 65, 16, 118, 32, 0, 65, 128, 254, 0, 113, 65, 2, 118, 114, 32, 0, 65, 15, 113, 65, 12, 116, 114, 11, 137, 1, 1, 3, 127, 32, 0, 65, 255, 1, 113, 33, 2, 32, 2, 65, 8, 116, 33, 3, 32, 3, 33, 1, 32, 0, 65, 128, 254, 0, 113, 65, 6, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 192, 1, 113, 65, 20, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 128, 248, 3, 113, 65, 8, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 60, 113, 65, 6, 116, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 1, 65, 192, 0, 107, 33, 1, 32, 1, 65, 128, 192, 0, 107, 33, 1, 32, 1, 65, 128, 16, 106, 33, 1, 32, 1, 65, 128, 128, 128, 224, 125, 106, 15, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 77, 11
            ]), { memory })

            if (utf16Module) {
                const get_dq_index = utf16Module.dq_index
                const get_ascii_only = utf16Module.ascii_only
                const get_utf16_length = utf16Module.utf16_length
                const utf8_to_utf16 = utf16Module.utf8_to_utf16

                return (base: string, context: JsonParsingContext, i: number): ReadResult<string> => {
                    const { reader, stack } = context

                    if (reader.raw) {
                        return decodeFromString(base, context, i)
                    }

                    const b = reader.bytes
                    const partial = Number(reader.writable)

                    const max_length = (b.length - i) * 3

                    if (ensureMemory(memory, max_length, setView)) {
                        let start = 0
                        if (b !== setted) {
                            memoryView.set(new Uint8Array(b.buffer, i, b.length - i))
                            settedStart = i
                            setted = b
                        }
                        else {
                            start = i - settedStart
                        }

                        const end_index = utf8_to_utf16(start, b.length - settedStart, b.length - settedStart + 1, partial)
                        if (end_index < 0) {
                            return {
                                type: ERROR,
                                error: new JSONParseError('Invalid data')
                            }
                        }
                        i = end_index + settedStart

                        const dq_index = get_dq_index()
                        const ascii_only = get_ascii_only() === 1

                        if (dq_index === -1) {
                            if (reader.writable) {
                                stack.push({
                                    isContinued: true,
                                    base: base.concat(ascii_only ?
                                        utf8(0, end_index, ascii_only) :
                                        utf16(length + 1, get_utf16_length()))
                                })
                                return {
                                    type: NEEDS_MORE_DATA,
                                    nextIndex: i
                                }
                            }
                            return {
                                type: ERROR,
                                error: new JSONParseError('')
                            }
                        }

                        if (ascii_only) {
                            const result = base.length === 0 ?
                                utf8(start, end_index, ascii_only) :
                                base.concat(utf8(start, end_index, ascii_only))
                            return {
                                type: COMPLETE,
                                value: result,
                                nextIndex: i + 1
                            }
                        }

                        const utf16_end = get_utf16_length()
                        const result = base.length === 0 ?
                            utf16(b.length - settedStart + 1, utf16_end) :
                            base.concat(utf16(b.length - settedStart + 1, utf16_end))
                        return {
                            type: COMPLETE,
                            value: result,
                            nextIndex: i + 1
                        }
                    }

                    ensureMemory(memory, MAX_MEMORY, setView)

                    while (true) {
                        const memory = Math.floor(MAX_MEMORY / 3)
                        const length = Math.min(memory, b.length - i)
                        const lastChunk = length < memory
                        const chunkPartial = lastChunk ? partial : 1

                        memoryView.set(new Uint8Array(b.buffer, i, length))

                        const end_index = utf8_to_utf16(0, length, length + 1, chunkPartial)
                        if (end_index < 0) {
                            return {
                                type: ERROR,
                                error: new JSONParseError('Invalid data')
                            }
                        }
                        i += end_index

                        const dq_index = get_dq_index()
                        const ascii_only = get_ascii_only() === 1

                        if (dq_index === -1) {
                            if (!lastChunk) {
                                base = ascii_only ?
                                    base.concat(utf8(0, end_index, ascii_only)) :
                                    base.concat(utf16(length + 1, get_utf16_length()))
                                continue
                            }
                            if (reader.writable) {
                                stack.push({
                                    isContinued: true,
                                    base: ascii_only ?
                                        base.concat(utf8(0, end_index, ascii_only)) :
                                        base.concat(utf16(length + 1, get_utf16_length()))
                                })
                                return {
                                    type: NEEDS_MORE_DATA,
                                    nextIndex: i
                                }
                            }
                            return {
                                type: ERROR,
                                error: new JSONParseError('')
                            }
                        }

                        if (ascii_only) {
                            return {
                                type: COMPLETE,
                                value: base.length === 0 ?
                                    utf8(0, end_index, ascii_only) :
                                    base.concat(utf8(0, end_index)),
                                nextIndex: i + 1
                            }
                        }

                        const utf16_end = get_utf16_length()
                        return {
                            type: COMPLETE,
                            value: base.length === 0 ?
                                utf16(length + 1, utf16_end) :
                                base.concat(utf16(length + 1, utf16_end)),
                            nextIndex: i + 1
                        }
                    }
                }
            }
        }

        const utf8Module = wasmInstance<UTF8Module>(new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 18, 3, 96, 0, 1, 127, 96, 3, 127, 127, 127, 1, 127, 96, 2, 127, 127, 1, 127, 2, 17, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 3, 8, 7, 0, 0, 1, 2, 2, 2, 1, 6, 11, 2, 127, 1, 65, 0, 11, 127, 1, 65, 127, 11, 7, 49, 4, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 0, 8, 100, 113, 95, 105, 110, 100, 101, 120, 0, 1, 12, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 56, 0, 2, 10, 153, 8, 7, 4, 0, 35, 0, 11, 4, 0, 35, 1, 11, 249, 4, 3, 2, 127, 2, 123, 2, 127, 65, 127, 36, 1, 65, 1, 36, 0, 65, 34, 253, 15, 33, 6, 2, 64, 3, 64, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 0, 32, 1, 16, 3, 34, 4, 33, 0, 35, 1, 65, 0, 78, 4, 64, 35, 1, 15, 11, 32, 4, 32, 1, 70, 4, 64, 32, 4, 15, 11, 11, 65, 0, 36, 0, 32, 0, 45, 0, 0, 34, 4, 65, 224, 1, 73, 4, 64, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 5, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 7, 32, 7, 65, 255, 255, 3, 70, 4, 64, 32, 0, 65, 16, 106, 33, 0, 12, 2, 11, 32, 7, 65, 255, 255, 3, 115, 104, 33, 8, 32, 0, 32, 8, 106, 33, 0, 12, 4, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 3, 32, 3, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 71, 13, 4, 32, 3, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 6, 4, 64, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 32, 0, 65, 2, 106, 33, 0, 12, 4, 11, 12, 4, 11, 11, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 1, 32, 0, 40, 0, 0, 33, 3, 32, 3, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 3, 65, 143, 192, 0, 113, 69, 32, 3, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 0, 65, 3, 106, 33, 0, 12, 2, 11, 11, 32, 3, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 3, 65, 255, 255, 3, 113, 65, 8, 16, 5, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 6, 4, 64, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 32, 2, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 0, 15, 5, 65, 127, 15, 11, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 34, 4, 65, 128, 1, 73, 4, 64, 32, 4, 65, 34, 70, 4, 64, 32, 0, 32, 0, 16, 4, 34, 4, 65, 0, 79, 4, 64, 32, 4, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 1, 11, 32, 4, 65, 194, 1, 107, 33, 4, 32, 4, 65, 30, 73, 4, 64, 32, 0, 65, 1, 106, 32, 1, 79, 4, 64, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 4, 64, 65, 127, 15, 11, 32, 0, 65, 2, 106, 33, 0, 12, 1, 11, 32, 4, 65, 46, 73, 4, 64, 32, 0, 65, 2, 106, 32, 1, 79, 4, 64, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 32, 0, 65, 2, 106, 45, 0, 0, 65, 191, 1, 75, 114, 4, 64, 65, 127, 15, 11, 32, 0, 65, 3, 106, 33, 0, 12, 1, 11, 11, 11, 32, 2, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 0, 15, 11, 65, 127, 15, 11, 135, 2, 2, 4, 127, 2, 123, 65, 34, 253, 15, 33, 7, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 6, 65, 0, 253, 15, 253, 43, 253, 100, 33, 5, 32, 5, 65, 255, 255, 3, 115, 104, 33, 4, 32, 4, 65, 32, 70, 4, 64, 65, 16, 33, 3, 5, 32, 4, 33, 3, 11, 32, 6, 32, 7, 253, 35, 253, 100, 4, 64, 32, 0, 32, 0, 32, 3, 106, 16, 4, 34, 2, 65, 0, 79, 4, 64, 32, 2, 15, 11, 11, 32, 3, 69, 4, 64, 32, 0, 15, 11, 32, 0, 32, 3, 106, 33, 0, 32, 3, 65, 16, 70, 13, 1, 32, 0, 15, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 5, 32, 5, 65, 128, 129, 130, 132, 120, 113, 65, 0, 70, 4, 64, 32, 0, 32, 0, 65, 4, 106, 16, 4, 34, 2, 65, 0, 74, 4, 64, 32, 2, 15, 11, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 5, 32, 5, 65, 128, 1, 79, 4, 64, 32, 0, 15, 11, 32, 5, 65, 34, 70, 32, 0, 32, 0, 16, 4, 34, 2, 65, 0, 74, 113, 4, 64, 32, 2, 15, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 15, 11, 11, 32, 0, 15, 11, 106, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 36, 1, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 1, 107, 116, 114, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 77, 11
        ]), { memory })

        if (utf8Module) {
            const get_ascii_only = utf8Module.ascii_only
            const get_dq_index = utf8Module.dq_index
            const utf8_to_utf8 = utf8Module.utf8_to_utf8

            return (base: string, { reader, stack }: JsonParsingContext, i: number): ReadResult<string> => {
                const b = reader.bytes
                const partial = Number(reader.writable)

                let end = b.length
                let length = end - i

                if (ensureMemory(memory, length, setView)) {
                    memoryView.set(new Uint8Array(b.buffer, i, length))

                    const end_index = utf8_to_utf8(0, length, partial)
                    if (end_index < 0) {
                        return {
                            type: ERROR,
                            error: new JSONParseError('Invalid data')
                        }
                    }
                    i += end_index

                    const dq_index = get_dq_index()
                    const ascii_only = get_ascii_only() === 1

                    if (dq_index === -1) {
                        if (reader.writable) {
                            stack.push({
                                isContinued: true,
                                base: base.length === 0 ?
                                    utf8(0, end_index, ascii_only) :
                                    base.concat(utf8(0, end_index, ascii_only))
                            })
                            return {
                                type: NEEDS_MORE_DATA,
                                nextIndex: i
                            }
                        }
                        return {
                            type: ERROR,
                            error: new JSONParseError('')
                        }
                    }

                    return {
                        type: COMPLETE,
                        value: base.length === 0 ?
                            utf8(0, dq_index, ascii_only) :
                            base.concat(utf8(0, dq_index, ascii_only)),
                        nextIndex: i + 1
                    }
                }

                ensureMemory(memory, MAX_MEMORY, setView)

                while (true) {
                    const memory = Math.floor(MAX_MEMORY / 3)
                    const length = Math.min(memory, b.length - i)
                    const lastChunk = length < memory
                    const chunkPartial = lastChunk ? partial : 1

                    memoryView.set(new Uint8Array(b.buffer, i, length))

                    const end_index = utf8_to_utf8(0, length, chunkPartial)
                    if (end_index < 0) {
                        return {
                            type: ERROR,
                            error: new JSONParseError('Invalid data')
                        }
                    }
                    i += end_index

                    const dq_index = get_dq_index()
                    const ascii_only = get_ascii_only() === 1

                    if (dq_index === -1) {
                        if (!lastChunk) {
                            base = base.concat(utf8(0, end_index, ascii_only))
                            continue
                        }
                        if (reader.writable) {
                            stack.push({
                                isContinued: true,
                                base: base.length === 0 ?
                                    utf8(0, end_index, ascii_only) :
                                    base.concat(utf8(0, end_index, ascii_only))
                            })
                            return {
                                type: NEEDS_MORE_DATA,
                                nextIndex: i
                            }
                        }
                        return {
                            type: ERROR,
                            error: new JSONParseError('')
                        }
                    }

                    return {
                        type: COMPLETE,
                        value: base.concat(utf8(0, end_index, ascii_only)),
                        nextIndex: i + 1
                    }
                }
            }
        }

        function findEndOfString(b: Uint8Array, i: number): number {
            const len = b.length

            function isEscaped(b: Uint8Array, i: number): boolean {
                let escaped = false
                while (b[i] === BACKSLASH) {
                    escaped = !escaped
                    i--
                }
                return escaped
            }

            while (i < len && (i & 3)) {
                if (b[i] === DQ && !isEscaped(b, i - 1))
                    return i
                i++
            }

            if (i === len) {
                return -1
            }

            const u32 = new Uint32Array(b.buffer, i, Math.floor((len - i) / 4))
            const len32 = u32.length

            const MASK = 0x22222222

            let j = 0
            while (j < len32 - 2) {
                const x1 = u32[j] ^ MASK
                const x2 = u32[j + 1] ^ MASK

                const chunk = (x1 | x2)
                if ((((chunk - 0x01010101) ^ chunk) & 0x80808080) !== 0)
                    break

                j += 2
            }

            i += j * 4

            while (i < len) {
                if (b[i] === DQ && !isEscaped(b, i - 1))
                    return i
                i++
            }

            return -1
        }

        function getLastCharIndex(b: Uint8Array, i: number): number {
            function isContinuationByte(b: number) {
                return ((b - 128) >>> 0) < 64
            }

            const len = i

            while (i >= 0 && isContinuationByte(b[i])) { i-- }
            if (i < 0) return 0

            const byte = b[i]
            if (byte < 128) { return i }

            const startByte = (b[i] - 194) >>> 0
            if (startByte < 30) {
                if (i + 1 <= len) { return i + 1 }
                return i - 1
            }

            if (startByte < 46) {
                if (i + 2 <= len) { return i + 2 }
                return i - 1
            }

            if (startByte < 50) {
                if (i + 3 <= len) { return i + 3 }
                return i - 1
            }

            return 0
        }

        function decode(base: string, { reader, stack, options }: JsonParsingContext, i: number): ReadResult<string> {
            const b = reader.bytes
            const utf8 = options.decoder
            const end_index = findEndOfString(b, i)

            if (end_index < 0) {
                if (reader.writable) {
                    const lastCharIndex = getLastCharIndex(b, b.length - 1) + 1
                    stack.push({
                        isContinued: true,
                        base: base.length === 0 ?
                            utf8.decode(new Uint8Array(b.buffer, i, lastCharIndex - i)) :
                            base.concat(utf8.decode(new Uint8Array(b.buffer, i, lastCharIndex - i)))
                    })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: lastCharIndex
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError('')
                }
            }

            return {
                type: COMPLETE,
                value: base.length === 0 ?
                    utf8.decode(new Uint8Array(b.buffer, i, end_index - i)) :
                    base.concat(utf8.decode(new Uint8Array(b.buffer, i, end_index - i))),
                nextIndex: end_index + 1
            }
        }

        return decode
    }

    const ensureMemory = (memory: WebAssembly.Memory, reqLength: number, onGrow: (memory: WebAssembly.Memory) => void): boolean => {
        try {
            const currentLength = memory.buffer.byteLength

            if (reqLength > MAX_MEMORY) {
                return false
            }

            if (reqLength > currentLength) {
                const pages = currentLength / PAGE_SIZE_BYTES
                const requiredPages = Math.ceil(reqLength / PAGE_SIZE_BYTES)
                memory.grow(requiredPages - pages)
                onGrow(memory)
                return true
            }

            return true
        }
        catch (error) {
            console.error(error)
            return false
        }
    }

    const decode = decoderFactory(options)

    const toString = (m: PrimitiveMeta<string>, context: JsonParsingContext, index: number, depth: number): ReadResult<string> => {
        const reader = context.reader
        const stack = context.stack

        const state = stack.pop()

        let isContinued: boolean = state?.isContinued ?? false
        let base: string = state?.base ?? ''

        const b = reader.bytes
        let i = index

        if (!isContinued) {
            if (b[i] !== DQ) {
                if (i >= b.length && reader.writable) {
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: i
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError(`Expected ", but found ${String.fromCharCode(b[i])}`, { metadata: m, index: i, depth })
                }
            }
            i++
        }

        return decode(base, context, i)
    }

    return {
        toString
    }
}

export const { toString } = createStringParser(defaultParseOptions)