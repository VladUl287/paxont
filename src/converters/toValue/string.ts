import { JsonParsingContext, PrimitiveMeta } from "../../metadata/types"
import { IS_BUN, IS_NODE } from "../../utils/platform"
import { BACKSLASH, DOUBLE_QUOTE, DOUBLE_QUOTE as DQ } from "../../utils/ascii_symbols"
import { JSONParseError } from "../../utils/error"
import { wasmInstance } from "../../utils/wasm"
import { StringParseOptions, utf16Module, utf8Module, utf8ScanModule } from "../types/string"
import { utf16LeDecoder, utf16LeDecoderForBuffer } from "../../utils/utf16"
import { utf8Decoder, utf8DecoderForBuffer } from "../../utils/utf8"
import { JsonReader } from "../../utils/reader"
import { ReadResult, ReadResultType } from "../../utils/result"

const ERROR = ReadResultType.ERROR
const COMPLETE = ReadResultType.COMPLETE
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

const defaultOptions: StringParseOptions = Object.freeze({
    defaultMemoryPages: 1, //~64KB
    maxMemoryPages: 128, //~8MB,
    wasmInstance,
    useUtf16: IS_NODE || IS_BUN,
    utf16LeDecoder: IS_NODE || IS_BUN ? utf16LeDecoderForBuffer : utf16LeDecoder,
    utf8Decoder: IS_NODE || IS_BUN ? utf8DecoderForBuffer : utf8Decoder
})

export function stringParser(opt: Partial<StringParseOptions> = defaultOptions) {
    const options: StringParseOptions = { ...defaultOptions, ...opt }
    const { defaultMemoryPages, maxMemoryPages, utf8Decoder: newUtf8, utf16LeDecoder: newUtf16, wasmInstance } = options

    const memory = new WebAssembly.Memory({
        initial: defaultMemoryPages,
        maximum: maxMemoryPages
    })

    const PAGE_SIZE_BYTES = Math.ceil(memory.buffer.byteLength / defaultMemoryPages)
    const MAX_MEMORY_BYTES = PAGE_SIZE_BYTES * maxMemoryPages

    let memoryView = new Uint8Array(memory.buffer)
    let utf16 = newUtf16(memoryView)
    let utf8 = newUtf8(memoryView)
    function setView(m: WebAssembly.Memory): void {
        memoryView = new Uint8Array(m.buffer)
        utf16 = newUtf16(memoryView)
        utf8 = newUtf8(memoryView)
    }

    let cacheView: Uint8Array | undefined = undefined
    let cacheViewStart: number = 0
    function clearCache(): void {
        cacheView = undefined
        cacheViewStart = 0
    }

    function isEscaped(b: Uint8Array, i: number): boolean {
        let escaped = false
        while (b[i--] === BACKSLASH) {
            escaped = !escaped
        }
        return escaped
    }

    const findEnd = (str: string, start: number): number => {
        let j = str.indexOf('"', start)
        let escaped = str[j - 1] === '\\'
        if (escaped) {
            do {
                let i = j - 1

                while (str[i--] === '\\') {
                    escaped = !escaped
                }
                if (!escaped) { break }

                j = str.indexOf('"', ++j)
            } while (j < str.length)
        }
        return j
    }

    const sparseDecoderFactory = (memory: WebAssembly.Memory) => {
        let decodeScanning = (reader: JsonReader, i: number): ReadResult<string> => {
            const { bytes: b, bytesLength, raw, sparseIndex } = reader

            if (raw === undefined) {
                return {
                    type: ERROR,
                    error: new JSONParseError("")
                }
            }

            let cI = sparseIndex?.codeUnitIndex ?? 0
            let bI = sparseIndex?.byteIndex ?? 0

            while (bI < i) {
                const byte = b[bI]

                if (byte < 128 || byte >= 192) {
                    cI++
                    if (byte >= 240) {
                        cI++
                    }
                }

                bI++
            }

            const charIndexStart = cI

            while (bI < bytesLength) {
                const byte = b[bI]

                if (b[bI] === DOUBLE_QUOTE && !isEscaped(b, i - 1)) {
                    break
                }

                if (byte < 128 || byte >= 192) {
                    cI++
                    if (byte >= 240) {
                        cI++
                    }
                }

                bI++
            }

            if (sparseIndex) {
                sparseIndex.codeUnitIndex = cI
                sparseIndex.byteIndex = bI
            }

            return {
                type: COMPLETE,
                value: raw.substring(charIndexStart, cI),
                nextIndex: bI + 1
            }
        }

        const utf8ScanModule = wasmInstance<utf8ScanModule>(new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 11, 2, 96, 0, 1, 127, 96, 2, 127, 127, 1, 127, 2, 17, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 3, 5, 4, 0, 1, 1, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 50, 3, 16, 99, 111, 100, 101, 95, 117, 110, 105, 116, 115, 95, 99, 111, 117, 110, 116, 0, 0, 9, 117, 116, 102, 56, 95, 115, 99, 97, 110, 0, 1, 15, 117, 116, 102, 56, 95, 115, 99, 97, 110, 95, 101, 120, 97, 99, 116, 0, 2, 10, 237, 3, 4, 4, 0, 35, 0, 11, 210, 1, 2, 5, 123, 3, 127, 65, 34, 253, 15, 33, 6, 65, 128, 1, 253, 15, 33, 2, 65, 192, 1, 253, 15, 33, 3, 65, 240, 1, 253, 15, 33, 4, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 75, 13, 1, 32, 0, 253, 0, 4, 0, 33, 5, 32, 5, 32, 6, 253, 35, 253, 100, 13, 1, 32, 7, 32, 5, 32, 4, 253, 44, 253, 100, 105, 106, 33, 7, 32, 5, 32, 3, 253, 78, 33, 5, 32, 5, 32, 2, 253, 35, 33, 5, 32, 7, 65, 16, 32, 5, 253, 100, 105, 107, 106, 33, 7, 32, 0, 65, 16, 106, 33, 0, 12, 0, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 8, 32, 8, 65, 34, 70, 4, 64, 32, 0, 32, 0, 16, 3, 34, 9, 65, 0, 78, 4, 64, 32, 7, 36, 0, 32, 9, 15, 11, 11, 32, 8, 65, 192, 1, 113, 65, 128, 1, 71, 4, 64, 32, 7, 65, 1, 32, 8, 65, 240, 1, 79, 106, 106, 33, 7, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 15, 11, 169, 1, 2, 4, 123, 2, 127, 65, 128, 1, 253, 15, 33, 2, 65, 192, 1, 253, 15, 33, 3, 65, 240, 1, 253, 15, 33, 4, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 75, 13, 1, 32, 0, 253, 0, 4, 0, 33, 5, 32, 6, 32, 5, 32, 4, 253, 44, 253, 100, 105, 106, 33, 6, 32, 5, 32, 3, 253, 78, 33, 5, 32, 5, 32, 2, 253, 35, 33, 5, 32, 6, 65, 16, 32, 5, 253, 100, 105, 107, 106, 33, 6, 32, 0, 65, 16, 106, 33, 0, 12, 0, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 7, 32, 7, 65, 192, 1, 113, 65, 128, 1, 73, 4, 64, 32, 6, 65, 1, 32, 7, 65, 240, 1, 79, 106, 106, 33, 6, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 6, 36, 0, 32, 0, 15, 11, 103, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 15, 11
        ]), { memory })

        if (utf8ScanModule !== undefined) {
            const { utf8_scan, utf8_scan_exact, code_units_count } = utf8ScanModule

            decodeScanning = (reader: JsonReader, i: number): ReadResult<string> => {
                const { bytes: b, bytesLength: len, raw, sparseIndex } = reader

                let cI = sparseIndex?.codeUnitIndex ?? 0
                let bI = sparseIndex?.byteIndex ?? 0

                if (cacheView !== b) {
                    memoryView.set(new Uint8Array(b.buffer, 0, len))
                    cacheView = b
                    reader.onRelease(clearCache)
                }

                bI = utf8_scan_exact(bI, i)
                cI += code_units_count()

                const start = cI

                const end_index = utf8_scan(bI, len)
                if (end_index === -1) {
                    return {
                        type: ERROR,
                        error: new JSONParseError("end of string not found")
                    }
                }

                bI = end_index
                cI += code_units_count()

                if (sparseIndex) {
                    sparseIndex.codeUnitIndex = cI
                    sparseIndex.byteIndex = bI
                }

                return {
                    type: COMPLETE,
                    value: raw!.substring(start, cI),
                    nextIndex: bI + 1
                }
            }
        }

        return (reader: JsonReader, i: number): ReadResult<string> => {
            const { bytes: b, bytesLength: len, raw, sparseIndex } = reader

            if (raw === undefined) {
                return {
                    type: ERROR,
                    error: new JSONParseError("")
                }
            }

            let cI = 0
            let bI = 0
            if (sparseIndex !== undefined) {
                cI = sparseIndex.codeUnitIndex
                bI = sparseIndex.byteIndex
            }

            const diff = bI - cI
            const ascii_only = raw.length === len || (len - raw.length === diff)

            if (ascii_only) {
                const j = findEnd(raw, i)
                return {
                    type: COMPLETE,
                    value: raw.substring(i - diff, j - diff),
                    nextIndex: j + 1
                }
            }

            return decodeScanning(reader, i)
        }
    }

    const decoderFactory = (opt: StringParseOptions) => {
        if (opt.useUtf16) {
            const utf16Module = wasmInstance<utf16Module>(
                new Uint8Array([
                    0, 97, 115, 109, 1, 0, 0, 0, 1, 70, 10, 96, 3, 127, 127, 127, 1, 127, 96, 0, 1, 127, 96, 4, 127, 127, 127, 127, 1, 127, 96, 6, 127, 127, 127, 127, 127, 127, 4, 127, 127, 127, 127, 96, 4, 127, 127, 127, 127, 2, 127, 127, 96, 2, 127, 127, 2, 127, 127, 96, 1, 127, 1, 127, 96, 2, 127, 127, 0, 96, 1, 123, 1, 123, 96, 2, 127, 127, 1, 127, 2, 36, 2, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 5, 117, 116, 105, 108, 115, 10, 102, 105, 110, 100, 95, 113, 117, 111, 116, 101, 0, 0, 3, 17, 16, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 6, 6, 6, 6, 0, 6, 16, 3, 127, 1, 65, 0, 11, 127, 1, 65, 127, 11, 127, 1, 65, 0, 11, 7, 56, 4, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 1, 8, 100, 113, 95, 105, 110, 100, 101, 120, 0, 2, 12, 117, 116, 102, 49, 54, 95, 108, 101, 110, 103, 116, 104, 0, 3, 13, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 49, 54, 0, 4, 10, 219, 24, 16, 4, 0, 35, 0, 11, 4, 0, 35, 1, 11, 4, 0, 35, 2, 11, 165, 8, 3, 3, 127, 2, 123, 5, 127, 32, 0, 33, 12, 65, 34, 253, 15, 33, 8, 65, 127, 36, 1, 65, 0, 36, 0, 65, 0, 36, 2, 32, 0, 32, 12, 32, 1, 32, 2, 65, 0, 32, 3, 16, 5, 33, 13, 36, 1, 33, 5, 33, 0, 32, 0, 65, 127, 70, 4, 64, 65, 127, 15, 11, 35, 1, 65, 0, 78, 4, 64, 32, 2, 32, 5, 70, 36, 0, 32, 5, 36, 2, 32, 0, 15, 11, 32, 0, 32, 1, 70, 32, 13, 114, 4, 64, 32, 3, 4, 64, 32, 2, 32, 5, 70, 36, 0, 32, 5, 36, 2, 32, 0, 15, 5, 65, 127, 15, 11, 11, 32, 5, 33, 2, 2, 64, 3, 64, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 0, 32, 12, 32, 1, 32, 2, 65, 1, 32, 3, 16, 5, 33, 13, 36, 1, 33, 5, 33, 0, 32, 0, 65, 127, 70, 4, 64, 65, 127, 15, 11, 35, 1, 65, 0, 78, 4, 64, 32, 5, 36, 2, 35, 1, 15, 11, 32, 0, 32, 1, 70, 32, 13, 114, 4, 64, 32, 3, 4, 64, 32, 5, 36, 2, 32, 0, 15, 5, 65, 127, 15, 11, 11, 32, 5, 33, 2, 11, 32, 0, 45, 0, 0, 34, 5, 65, 224, 1, 73, 4, 64, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 7, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 9, 32, 9, 65, 255, 255, 3, 70, 4, 64, 32, 2, 32, 7, 16, 10, 253, 11, 4, 0, 32, 0, 65, 16, 106, 33, 0, 32, 2, 65, 16, 106, 33, 2, 12, 2, 11, 32, 2, 32, 7, 16, 10, 253, 11, 4, 0, 32, 9, 65, 255, 255, 3, 115, 104, 33, 10, 32, 0, 32, 10, 106, 33, 0, 32, 2, 32, 10, 106, 33, 2, 12, 4, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 32, 0, 40, 0, 0, 33, 4, 32, 4, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 70, 69, 13, 1, 32, 4, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 16, 4, 64, 32, 2, 32, 4, 16, 13, 54, 2, 0, 32, 0, 65, 4, 106, 33, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 40, 0, 0, 33, 4, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 12, 1, 11, 32, 2, 32, 4, 16, 12, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 3, 11, 11, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 1, 32, 0, 40, 0, 0, 33, 4, 32, 4, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 4, 65, 143, 192, 0, 113, 69, 32, 4, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 2, 32, 4, 16, 14, 54, 2, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 2, 11, 11, 32, 4, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 4, 65, 255, 255, 3, 113, 65, 8, 16, 11, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 16, 4, 64, 32, 2, 32, 4, 16, 15, 54, 2, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 32, 3, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 0, 15, 5, 65, 127, 15, 11, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 34, 5, 65, 128, 1, 73, 4, 64, 32, 5, 65, 34, 70, 4, 64, 32, 0, 32, 12, 32, 0, 16, 0, 34, 5, 65, 0, 78, 4, 64, 32, 2, 36, 2, 32, 5, 36, 1, 32, 5, 15, 11, 11, 32, 2, 32, 5, 59, 1, 0, 32, 0, 65, 1, 106, 33, 0, 32, 2, 65, 2, 106, 33, 2, 12, 1, 11, 32, 5, 65, 194, 1, 107, 33, 6, 32, 6, 65, 30, 73, 4, 64, 32, 0, 65, 1, 106, 32, 1, 79, 4, 64, 32, 2, 36, 2, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 128, 1, 107, 65, 192, 0, 79, 4, 64, 65, 127, 15, 11, 32, 2, 32, 5, 65, 31, 113, 65, 6, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 1, 11, 32, 6, 65, 46, 73, 4, 64, 32, 0, 65, 2, 106, 32, 1, 79, 4, 64, 32, 2, 36, 2, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 128, 1, 107, 65, 192, 0, 79, 32, 0, 65, 2, 106, 45, 0, 0, 65, 128, 1, 107, 65, 192, 0, 79, 114, 4, 64, 65, 127, 15, 11, 32, 6, 65, 12, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 6, 116, 106, 33, 11, 32, 11, 65, 128, 144, 8, 73, 32, 11, 65, 128, 176, 11, 107, 65, 128, 16, 73, 114, 4, 64, 65, 127, 15, 11, 32, 2, 32, 5, 65, 15, 113, 65, 12, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 0, 65, 2, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 1, 11, 11, 11, 32, 3, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 2, 36, 2, 32, 0, 15, 11, 65, 127, 15, 11, 239, 4, 3, 4, 127, 5, 123, 2, 127, 32, 0, 33, 15, 32, 3, 33, 16, 65, 0, 253, 15, 33, 11, 65, 34, 253, 15, 33, 12, 65, 220, 0, 253, 15, 33, 13, 65, 128, 1, 253, 15, 33, 14, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 2, 79, 13, 1, 32, 0, 253, 0, 4, 0, 34, 10, 65, 0, 253, 15, 253, 43, 253, 100, 65, 255, 255, 3, 115, 104, 33, 8, 32, 8, 69, 4, 64, 32, 4, 69, 4, 64, 32, 15, 33, 0, 65, 1, 33, 4, 12, 2, 11, 32, 0, 32, 3, 65, 127, 65, 0, 15, 11, 32, 8, 65, 32, 70, 4, 64, 65, 16, 33, 8, 11, 32, 10, 32, 13, 253, 35, 253, 100, 33, 6, 32, 6, 32, 6, 65, 1, 118, 113, 33, 7, 32, 6, 32, 7, 65, 127, 115, 113, 33, 7, 32, 7, 4, 64, 32, 4, 69, 4, 64, 32, 15, 33, 0, 65, 1, 33, 4, 12, 2, 11, 65, 1, 33, 4, 11, 32, 10, 32, 12, 253, 35, 253, 100, 4, 64, 32, 0, 32, 1, 32, 0, 32, 8, 106, 16, 0, 34, 6, 65, 0, 78, 4, 64, 32, 0, 32, 6, 107, 33, 8, 32, 4, 4, 64, 32, 7, 4, 64, 32, 0, 32, 0, 32, 8, 106, 32, 2, 32, 3, 16, 6, 33, 3, 33, 0, 5, 32, 3, 32, 10, 253, 137, 1, 253, 11, 4, 0, 32, 3, 65, 16, 106, 32, 10, 253, 138, 1, 253, 11, 4, 0, 32, 3, 32, 8, 65, 1, 116, 106, 33, 3, 11, 11, 32, 6, 32, 3, 32, 6, 65, 0, 15, 11, 11, 32, 4, 4, 64, 32, 7, 4, 64, 32, 0, 32, 0, 32, 8, 106, 32, 2, 32, 3, 16, 6, 33, 3, 33, 0, 5, 32, 3, 32, 10, 253, 137, 1, 253, 11, 4, 0, 32, 3, 65, 16, 106, 32, 10, 253, 138, 1, 253, 11, 4, 0, 32, 3, 32, 8, 65, 1, 116, 106, 33, 3, 32, 0, 32, 8, 106, 33, 0, 11, 5, 32, 0, 32, 8, 106, 33, 0, 11, 32, 8, 65, 16, 70, 13, 0, 32, 4, 69, 4, 64, 32, 15, 33, 0, 65, 1, 33, 4, 12, 1, 11, 32, 0, 32, 3, 65, 127, 65, 0, 15, 11, 11, 2, 64, 3, 64, 32, 0, 32, 2, 79, 13, 1, 32, 0, 45, 0, 0, 33, 9, 32, 9, 65, 128, 1, 79, 4, 64, 32, 4, 69, 4, 64, 32, 15, 32, 1, 32, 2, 32, 16, 32, 5, 65, 1, 16, 5, 15, 5, 32, 0, 32, 3, 65, 127, 65, 0, 15, 11, 11, 32, 9, 65, 34, 70, 4, 64, 32, 0, 32, 15, 32, 0, 16, 0, 34, 6, 65, 0, 78, 4, 64, 32, 6, 32, 3, 32, 6, 65, 0, 15, 11, 11, 65, 0, 33, 7, 32, 9, 65, 220, 0, 70, 4, 64, 32, 4, 69, 4, 64, 32, 15, 33, 0, 65, 1, 33, 4, 12, 2, 11, 65, 1, 33, 7, 11, 32, 4, 4, 64, 32, 7, 4, 64, 32, 0, 33, 9, 32, 0, 32, 0, 65, 1, 106, 32, 2, 32, 3, 16, 6, 33, 3, 33, 0, 32, 0, 32, 9, 70, 4, 64, 32, 5, 4, 64, 32, 9, 32, 3, 65, 127, 65, 1, 15, 5, 65, 127, 65, 127, 65, 127, 65, 0, 15, 11, 11, 12, 2, 5, 32, 3, 32, 9, 59, 1, 0, 32, 3, 65, 2, 106, 33, 3, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 32, 3, 65, 127, 65, 0, 15, 11, 236, 6, 1, 6, 127, 32, 0, 33, 4, 32, 3, 33, 6, 2, 64, 3, 64, 32, 4, 32, 1, 79, 13, 1, 32, 4, 45, 0, 0, 33, 5, 32, 5, 65, 220, 0, 70, 4, 64, 32, 4, 65, 1, 106, 32, 2, 79, 13, 2, 32, 4, 65, 1, 106, 33, 4, 32, 4, 45, 0, 0, 33, 5, 2, 64, 32, 5, 65, 238, 0, 70, 4, 64, 32, 6, 65, 10, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 244, 0, 70, 4, 64, 32, 6, 65, 9, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 242, 0, 70, 4, 64, 32, 6, 65, 13, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 226, 0, 70, 4, 64, 32, 6, 65, 8, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 230, 0, 70, 4, 64, 32, 6, 65, 12, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 220, 0, 70, 4, 64, 32, 6, 65, 220, 0, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 34, 70, 4, 64, 32, 6, 65, 34, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 39, 70, 4, 64, 32, 6, 65, 39, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 5, 65, 245, 0, 70, 4, 64, 32, 4, 65, 1, 106, 33, 4, 32, 4, 32, 2, 16, 7, 33, 8, 33, 4, 32, 8, 65, 127, 70, 4, 64, 32, 4, 65, 2, 107, 32, 6, 15, 11, 32, 8, 65, 128, 176, 3, 79, 32, 8, 65, 255, 183, 3, 77, 113, 4, 64, 32, 8, 33, 9, 2, 64, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 0, 32, 4, 65, 1, 106, 45, 0, 0, 65, 245, 0, 71, 13, 0, 32, 4, 65, 2, 106, 33, 4, 32, 4, 32, 2, 16, 7, 33, 8, 33, 4, 32, 8, 65, 127, 70, 4, 64, 32, 4, 65, 2, 107, 32, 6, 15, 11, 32, 8, 65, 128, 184, 3, 79, 32, 8, 65, 255, 191, 3, 77, 113, 4, 64, 32, 9, 65, 128, 176, 3, 107, 65, 10, 116, 32, 8, 65, 128, 184, 3, 107, 114, 33, 7, 32, 7, 65, 128, 128, 4, 106, 33, 7, 32, 6, 32, 7, 16, 9, 32, 6, 65, 4, 106, 33, 6, 12, 4, 5, 32, 6, 32, 9, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 6, 107, 33, 4, 12, 4, 11, 11, 32, 6, 32, 9, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 5, 32, 6, 32, 8, 16, 9, 32, 6, 32, 8, 65, 255, 255, 3, 75, 4, 127, 65, 4, 5, 65, 2, 11, 106, 33, 6, 11, 12, 1, 11, 11, 12, 1, 11, 32, 5, 65, 128, 1, 73, 4, 64, 32, 6, 32, 5, 59, 1, 0, 32, 6, 65, 2, 106, 33, 6, 32, 4, 65, 1, 106, 33, 4, 5, 32, 5, 65, 224, 1, 113, 65, 192, 1, 70, 4, 64, 32, 5, 65, 31, 113, 65, 6, 116, 32, 4, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 33, 7, 32, 6, 32, 7, 16, 9, 32, 6, 32, 7, 65, 255, 255, 3, 75, 4, 127, 65, 4, 5, 65, 2, 11, 106, 33, 6, 32, 4, 65, 2, 106, 33, 4, 5, 32, 5, 65, 240, 1, 113, 65, 224, 1, 70, 4, 64, 32, 5, 65, 15, 113, 65, 12, 116, 32, 4, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 4, 65, 2, 106, 45, 0, 0, 65, 63, 113, 114, 33, 7, 32, 6, 32, 7, 16, 9, 32, 6, 32, 7, 65, 255, 255, 3, 75, 4, 127, 65, 4, 5, 65, 2, 11, 106, 33, 6, 32, 4, 65, 3, 106, 33, 4, 5, 32, 5, 65, 248, 1, 113, 65, 240, 1, 70, 4, 64, 32, 5, 65, 7, 113, 65, 18, 116, 32, 4, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 12, 116, 114, 32, 4, 65, 2, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 4, 65, 3, 106, 45, 0, 0, 65, 63, 113, 114, 33, 7, 32, 6, 32, 7, 16, 9, 32, 6, 32, 7, 65, 255, 255, 3, 75, 4, 127, 65, 4, 5, 65, 2, 11, 106, 33, 6, 32, 4, 65, 4, 106, 33, 4, 5, 32, 4, 65, 1, 106, 33, 4, 11, 11, 11, 11, 12, 0, 11, 11, 32, 4, 32, 6, 15, 11, 90, 1, 3, 127, 32, 0, 33, 4, 65, 0, 33, 2, 32, 4, 65, 4, 106, 32, 1, 75, 4, 64, 32, 4, 65, 127, 15, 11, 2, 64, 3, 64, 32, 4, 45, 0, 0, 33, 3, 32, 3, 16, 8, 65, 127, 70, 4, 64, 32, 4, 65, 127, 15, 11, 32, 2, 65, 4, 116, 32, 3, 16, 8, 114, 33, 2, 32, 4, 65, 1, 106, 33, 4, 32, 4, 32, 0, 107, 65, 4, 73, 13, 0, 11, 11, 32, 4, 32, 2, 15, 11, 86, 1, 1, 127, 65, 127, 33, 1, 32, 0, 65, 48, 79, 32, 0, 65, 57, 77, 113, 4, 64, 32, 0, 65, 48, 107, 33, 1, 11, 32, 0, 65, 193, 0, 79, 32, 0, 65, 198, 0, 77, 113, 4, 64, 32, 0, 65, 193, 0, 107, 65, 10, 106, 33, 1, 11, 32, 0, 65, 225, 0, 79, 32, 0, 65, 230, 0, 77, 113, 4, 64, 32, 0, 65, 225, 0, 107, 65, 10, 106, 33, 1, 11, 32, 1, 15, 11, 63, 0, 32, 1, 65, 255, 255, 3, 75, 4, 64, 32, 1, 65, 128, 128, 4, 107, 33, 1, 32, 0, 65, 128, 176, 3, 32, 1, 65, 10, 118, 114, 59, 1, 0, 32, 0, 65, 2, 106, 65, 128, 184, 3, 32, 1, 65, 255, 7, 113, 114, 59, 1, 0, 5, 32, 0, 32, 1, 59, 1, 0, 11, 11, 76, 1, 2, 123, 32, 0, 253, 12, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 253, 78, 33, 1, 32, 1, 65, 6, 253, 139, 1, 33, 1, 32, 0, 65, 8, 253, 141, 1, 33, 2, 32, 2, 253, 12, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 253, 78, 33, 2, 32, 1, 32, 2, 253, 80, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 1, 107, 116, 114, 11, 30, 0, 32, 0, 65, 8, 118, 65, 255, 1, 113, 32, 0, 65, 255, 1, 113, 65, 6, 116, 106, 65, 128, 224, 0, 107, 65, 128, 1, 107, 11, 26, 0, 32, 0, 65, 128, 254, 128, 248, 3, 113, 65, 8, 118, 32, 0, 65, 159, 128, 252, 0, 113, 65, 6, 116, 114, 11, 33, 0, 32, 0, 65, 128, 128, 252, 1, 113, 65, 16, 118, 32, 0, 65, 128, 254, 0, 113, 65, 2, 118, 114, 32, 0, 65, 15, 113, 65, 12, 116, 114, 11, 137, 1, 1, 3, 127, 32, 0, 65, 255, 1, 113, 33, 2, 32, 2, 65, 8, 116, 33, 3, 32, 3, 33, 1, 32, 0, 65, 128, 254, 0, 113, 65, 6, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 192, 1, 113, 65, 20, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 128, 248, 3, 113, 65, 8, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 60, 113, 65, 6, 116, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 1, 65, 192, 0, 107, 33, 1, 32, 1, 65, 128, 192, 0, 107, 33, 1, 32, 1, 65, 128, 16, 106, 33, 1, 32, 1, 65, 128, 128, 128, 224, 125, 106, 15, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 77, 11
                ]),
                { imports: { env: { memory }, utils: utilsModule! } })

            if (utf16Module) {
                const get_dq_index = utf16Module.dq_index
                const get_ascii_only = utf16Module.ascii_only
                const get_utf16_length = utf16Module.utf16_length
                const utf8_to_utf16 = utf16Module.utf8_to_utf16

                return (base: string, context: JsonParsingContext, i: number): ReadResult<string> => {
                    const { reader, stack } = context
                    const { bytes: b, bytesLength, writable } = reader

                    const partial = Number(writable)
                    const max_length = (bytesLength - i) * 3
                    if (max_length < memoryView.length || ensureMemory(memory, max_length, setView)) {
                        let start = 0

                        if (cacheView !== b) {
                            memoryView.set(new Uint8Array(b.buffer, i, bytesLength - i))
                            cacheViewStart = i
                            cacheView = b
                            reader.onRelease(clearCache)
                        }
                        else {
                            start = i - cacheViewStart
                        }

                        const end_index = utf8_to_utf16(start, bytesLength - cacheViewStart, bytesLength - cacheViewStart + 1, partial)
                        if (end_index < 0) {
                            return {
                                type: ERROR,
                                error: new JSONParseError('Invalid data')
                            }
                        }
                        i = end_index + cacheViewStart

                        const dq_index = get_dq_index()
                        const ascii_only = get_ascii_only() === 1

                        if (dq_index === -1) {
                            if (reader.writable) {
                                stack.push({
                                    isContinued: true,
                                    base: base.concat(ascii_only ?
                                        utf8(start, end_index, ascii_only) :
                                        utf16(bytesLength - cacheViewStart + 1, get_utf16_length()))
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
                                    utf8(start, end_index, ascii_only) :
                                    base.concat(utf8(start, end_index, ascii_only)),
                                nextIndex: i + 1
                            }
                        }

                        const utf16_end = get_utf16_length()
                        return {
                            type: COMPLETE,
                            value: base.length === 0 ?
                                utf16(bytesLength - cacheViewStart + 1, utf16_end) :
                                base.concat(utf16(bytesLength - cacheViewStart + 1, utf16_end)),
                            nextIndex: i + 1
                        }
                    }

                    ensureMemory(memory, MAX_MEMORY_BYTES, setView)

                    while (true) {
                        const memory = Math.floor(MAX_MEMORY_BYTES / 3)
                        const length = Math.min(memory, bytesLength - i)
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
                                    utf8(0, end_index, true) :
                                    base.concat(utf8(0, end_index, true)),
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

        const utf8Module = wasmInstance<utf8Module>(new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 18, 3, 96, 0, 1, 127, 96, 3, 127, 127, 127, 1, 127, 96, 2, 127, 127, 1, 127, 2, 17, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 3, 8, 7, 0, 0, 1, 2, 2, 2, 1, 6, 11, 2, 127, 1, 65, 0, 11, 127, 1, 65, 127, 11, 7, 49, 4, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 0, 8, 100, 113, 95, 105, 110, 100, 101, 120, 0, 1, 12, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 56, 0, 2, 10, 210, 8, 7, 4, 0, 35, 0, 11, 4, 0, 35, 1, 11, 177, 5, 3, 2, 127, 2, 123, 3, 127, 65, 127, 36, 1, 65, 1, 36, 0, 65, 34, 253, 15, 33, 6, 2, 64, 3, 64, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 0, 32, 1, 16, 3, 34, 4, 33, 0, 35, 1, 65, 0, 78, 4, 64, 35, 1, 15, 11, 32, 4, 32, 1, 70, 4, 64, 32, 4, 15, 11, 11, 65, 0, 36, 0, 32, 0, 45, 0, 0, 34, 4, 65, 224, 1, 73, 4, 64, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 5, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 7, 32, 7, 65, 255, 255, 3, 70, 4, 64, 32, 0, 65, 16, 106, 33, 0, 12, 2, 11, 32, 7, 65, 255, 255, 3, 115, 104, 33, 8, 32, 0, 32, 8, 106, 33, 0, 12, 4, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 3, 32, 3, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 71, 13, 2, 32, 3, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 6, 4, 64, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 32, 0, 65, 2, 106, 33, 0, 12, 4, 11, 12, 4, 11, 11, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 1, 32, 0, 40, 0, 0, 33, 3, 32, 3, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 3, 65, 143, 192, 0, 113, 69, 32, 3, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 0, 65, 3, 106, 33, 0, 12, 2, 11, 11, 32, 3, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 3, 65, 255, 255, 3, 113, 65, 8, 16, 5, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 6, 4, 64, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 32, 2, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 0, 15, 5, 65, 127, 15, 11, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 34, 4, 65, 128, 1, 73, 4, 64, 32, 4, 65, 34, 70, 4, 64, 32, 0, 32, 0, 16, 4, 34, 4, 65, 0, 79, 4, 64, 32, 4, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 1, 11, 32, 4, 65, 194, 1, 107, 33, 4, 32, 4, 65, 30, 73, 4, 64, 32, 0, 65, 1, 106, 32, 1, 79, 4, 64, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 128, 1, 107, 65, 192, 0, 79, 4, 64, 65, 127, 15, 11, 32, 0, 65, 2, 106, 33, 0, 12, 1, 11, 32, 4, 65, 46, 73, 4, 64, 32, 0, 65, 2, 106, 32, 1, 79, 4, 64, 32, 0, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 128, 1, 107, 65, 192, 0, 79, 32, 0, 65, 2, 106, 45, 0, 0, 65, 128, 1, 107, 65, 192, 0, 79, 114, 4, 64, 65, 127, 15, 11, 32, 4, 65, 12, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 6, 116, 106, 33, 9, 32, 9, 65, 128, 144, 8, 73, 32, 9, 65, 128, 176, 11, 107, 65, 128, 16, 73, 114, 4, 64, 65, 127, 15, 11, 32, 0, 65, 3, 106, 33, 0, 12, 1, 11, 11, 11, 32, 2, 32, 0, 65, 4, 106, 32, 1, 75, 113, 4, 64, 32, 0, 15, 11, 65, 127, 15, 11, 135, 2, 2, 4, 127, 2, 123, 65, 34, 253, 15, 33, 7, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 6, 65, 0, 253, 15, 253, 43, 253, 100, 33, 5, 32, 5, 65, 255, 255, 3, 115, 104, 33, 4, 32, 4, 65, 32, 70, 4, 64, 65, 16, 33, 3, 5, 32, 4, 33, 3, 11, 32, 6, 32, 7, 253, 35, 253, 100, 4, 64, 32, 0, 32, 0, 32, 3, 106, 16, 4, 34, 2, 65, 0, 78, 4, 64, 32, 2, 15, 11, 11, 32, 3, 69, 4, 64, 32, 0, 15, 11, 32, 0, 32, 3, 106, 33, 0, 32, 3, 65, 16, 70, 13, 1, 32, 0, 15, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 5, 32, 5, 65, 128, 129, 130, 132, 120, 113, 65, 0, 70, 4, 64, 32, 0, 32, 0, 65, 4, 106, 16, 4, 34, 2, 65, 0, 78, 4, 64, 32, 2, 15, 11, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 5, 32, 5, 65, 128, 1, 79, 4, 64, 32, 0, 15, 11, 32, 5, 65, 34, 70, 32, 0, 32, 0, 16, 4, 34, 2, 65, 0, 78, 113, 4, 64, 32, 2, 15, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 15, 11, 11, 32, 0, 15, 11, 107, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 36, 1, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 15, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 1, 107, 116, 114, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 77, 11
        ]), { memory })

        if (utf8Module) {
            const get_ascii_only = utf8Module.ascii_only
            const get_dq_index = utf8Module.dq_index
            const utf8_to_utf8 = utf8Module.utf8_to_utf8

            return (base: string, ctx: JsonParsingContext, i: number): ReadResult<string> => {
                const { reader, stack } = ctx
                const { bytes: b, bytesLength, writable, raw } = reader

                const partial = Number(writable)
                if (bytesLength < memoryView.length || ensureMemory(memory, bytesLength, setView)) {
                    let start = 0

                    if (cacheView !== b) {
                        memoryView.set(new Uint8Array(b.buffer, i, bytesLength - i))
                        cacheViewStart = i
                        cacheView = b
                        reader.onRelease(clearCache)
                    }
                    else {
                        start = i - cacheViewStart
                    }

                    const end_index = utf8_to_utf8(start, bytesLength - cacheViewStart, partial)
                    if (end_index < 0) {
                        return {
                            type: ERROR,
                            error: new JSONParseError('Invalid data')
                        }
                    }
                    i = end_index + cacheViewStart

                    const dq_index = get_dq_index()
                    const ascii_only = get_ascii_only() === 1

                    if (dq_index === -1) {
                        if (reader.writable) {
                            stack.push({
                                isContinued: true,
                                base: base.length === 0 ?
                                    utf8(start, end_index, ascii_only) :
                                    base.concat(utf8(start, end_index, ascii_only))
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
                            utf8(start, dq_index, ascii_only) :
                            base.concat(utf8(start, dq_index, ascii_only)),
                        nextIndex: i + 1
                    }
                }

                ensureMemory(memory, MAX_MEMORY_BYTES, setView)

                while (true) {
                    const memory = Math.floor(MAX_MEMORY_BYTES / 3)
                    const length = Math.min(memory, bytesLength - i)
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

        function findEnd(b: Uint8Array, len: number, i: number): number {
            while (i <= len - 4) {
                const a1 = (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24) ^ 0x22222222

                if (((a1 - 0x01010101) & (~a1) & 0x80808080) !== 0)
                    break

                i += 4
            }

            while (i < len) {
                if (b[i] === DQ) {
                    return isEscaped(b, i) ?
                        findEnd(b, len, i + 1) :
                        i
                }
                i++
            }
            return -1
        }

        function findLastChar(b: Uint8Array, start: number, len: number): number {
            function isContinuationByte(b: number) {
                return ((b - 128) >>> 0) < 64
            }

            let i = len - 1
            if (i <= start) { return start }
            while (i > start && isContinuationByte(b[i])) { i-- }

            let byte = b[i]
            if (byte < 128) { return i }

            byte = (b[i] - 194) >>> 0
            if (byte < 30) {
                if (i + 1 < len) {
                    return i + 2
                }
                return Math.max(i, start)
            }

            if (byte < 46) {
                if (i + 2 < len) {
                    return i + 3
                }
                return Math.max(i, start)
            }

            if (byte < 50) {
                if (i + 3 < len) {
                    return i + 4
                }
                return Math.max(i, start)
            }

            return start
        }

        function decodeBytes(base: string, ctx: JsonParsingContext, i: number): ReadResult<string> {
            const { reader: { bytes: b, bytesLength, raw, writable }, stack, options } = ctx

            const utf8 = options.decoder
            const end_index = findEnd(b, bytesLength, i)

            if (end_index < 0) {
                if (writable) {
                    const end_index = findLastChar(b, i, bytesLength)
                    try {
                        base = base.length === 0 ?
                            utf8.decode(new Uint8Array(b.buffer, i, end_index - i)) :
                            base.concat(utf8.decode(new Uint8Array(b.buffer, i, end_index - i)))
                    }
                    catch (error) {
                        return {
                            type: ERROR,
                            error: new JSONParseError('Decode error', { cause: error, index: i })
                        }
                    }
                    stack.push({ isContinued: true, base })
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: end_index
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError('')
                }
            }

            try {
                base = base.length === 0 ?
                    utf8.decode(new Uint8Array(b.buffer, i, end_index - i)) :
                    base.concat(utf8.decode(new Uint8Array(b.buffer, i, end_index - i)))
            }
            catch (error) {
                return {
                    type: ERROR,
                    error: new JSONParseError('Decode error', { cause: error, index: i })
                }
            }
            return {
                type: COMPLETE,
                value: base,
                nextIndex: end_index + 1
            }
        }

        return decodeBytes
    }

    const ensureMemory = (memory: WebAssembly.Memory, reqLength: number, onGrow: (memory: WebAssembly.Memory) => void): boolean => {
        try {
            const currentLength = memory.buffer.byteLength

            if (reqLength > MAX_MEMORY_BYTES) {
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
    const decodeString = sparseDecoderFactory(memory)

    const toString = (metadata: PrimitiveMeta<string>, context: JsonParsingContext): ReadResult<string> => {
        const { reader, stack } = context
        const { bytes: b, bytesLength: len, writable, position, raw } = reader

        const state = stack.pop()
        const isContinued: boolean = state?.isContinued ?? false
        const base: string = state?.base ?? ''

        let i = position
        if (!isContinued) {
            if (b[i] !== DQ) {
                if (writable && i >= len) {
                    return {
                        type: NEEDS_MORE_DATA,
                        nextIndex: i
                    }
                }
                return {
                    type: ERROR,
                    error: new JSONParseError(`Expected ", but found ${String.fromCharCode(b[i])}`, { metadata, index: i })
                }
            }
            i++
        }

        if (raw !== undefined) {
            return decodeString(reader, i)
        }

        return decode(base, context, i)
    }

    return {
        toString
    }
}

export const { toString } = stringParser(defaultOptions)