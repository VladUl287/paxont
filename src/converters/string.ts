import { genUnrolledFromCharCode } from "../code_gen/string"
import { ParseContext, JsonReader, PrimitiveMeta, ParseState } from "../metadata/types"
import { CURRENT_PLATFORM, isBun, isNode } from "../utils/platform"
import { ReadResult, ReadResultType } from "../utils/types"
import { DOUBLE_QUOTE as DQ } from "../utils/ascii_symbols"
import { JSONParseError } from "../utils/error"

const unsafeDecoder8 = new TextDecoder('utf-8', { fatal: false })
const unsafeDecoder16 = new TextDecoder('utf-16le', { fatal: false })

const { decode } = useDecoder({
    initialWasmMemoryPages: 1, //~64KiB
    maxWasmMemoryPages: 128, //~8MiB,

    canExtendToUtf16: isNode(CURRENT_PLATFORM) || isBun(CURRENT_PLATFORM),

    newUtf16: isNode(CURRENT_PLATFORM) || isBun(CURRENT_PLATFORM) ?
        (bytes: Uint8Array) => {
            const buffer = Buffer.from(bytes.buffer)
            return (start, end) => buffer.toString('utf16le', start, end)
        } :
        (bytes: Uint8Array) => (start, end) => unsafeDecoder16.decode(new Uint8Array(bytes.buffer, start, end - start)),

    newUtf8: isNode(CURRENT_PLATFORM) || isBun(CURRENT_PLATFORM) ?
        (bytes: Uint8Array) => {
            const buffer = Buffer.from(bytes.buffer)
            return (start, end) => {
                const length = end - start
                if (length <= 64) {
                    return factories[length](buffer, start)
                }
                return buffer.toString('utf8', start, end)
            }
        } :
        (bytes: Uint8Array) => (start, end) => {
            const length = end - start
            if (length <= 64) {
                return factories[length](bytes, start)
            }
            return unsafeDecoder8.decode(new Uint8Array(bytes.buffer, start, end - start))
        }
})

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

type UTF8Module = {
    readonly memory: WebAssembly.Memory
    readonly dq_index: () => number
    readonly try_find_end_of_string: (start: number) => number
}

type UTF16Module = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly dq_index: () => number
    readonly utf16_length: () => number
    readonly utf8_to_utf16: (start: number, end: number, target: number) => number
}

type ParserOptions = {
    readonly maxWasmMemoryPages: number
    readonly initialWasmMemoryPages: number
    readonly canExtendToUtf16: boolean,
    newUtf16: (bytes: Uint8Array) => (start: number, end: number) => string,
    newUtf8: (bytes: Uint8Array) => (start: number, end: number) => string
}

export function stringParser(options: ParserOptions) {
    const { initialWasmMemoryPages, maxWasmMemoryPages, newUtf8, newUtf16 } = options

    const memory = new WebAssembly.Memory({
        initial: initialWasmMemoryPages,
        maximum: maxWasmMemoryPages
    })

    let memoryView = new Uint8Array(memory.buffer)
    let utf16 = newUtf16(memoryView)
    let utf8 = newUtf8(memoryView)

    function setView(m: WebAssembly.Memory) {
        memoryView = new Uint8Array(m.buffer)
        utf16 = newUtf16(memoryView)
        utf8 = newUtf8(memoryView)
    }

    const PAGE_SIZE_BYTES = Math.ceil(memory.buffer.byteLength / initialWasmMemoryPages)
    const MAX_MEMORY = PAGE_SIZE_BYTES * maxWasmMemoryPages

    const wasmInstance = <T>(bytes: Uint8Array<ArrayBuffer>, memory: WebAssembly.Memory): T | undefined => {
        try {
            return new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { memory: memory } }).exports as T
        }
        catch (error) {
            console.error(error)
            return undefined
        }
    }

    const decodeFactory = (opt: ParserOptions) => {
        if (opt.canExtendToUtf16) {
            const utf16Module = wasmInstance<UTF16Module>(new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 34, 6, 96, 0, 1, 127, 96, 3, 127, 127, 127, 1, 127, 96, 3, 127, 127, 127, 0, 96, 1, 123, 1, 123, 96, 2, 127, 127, 1, 127, 96, 1, 127, 1, 127, 2, 17, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 3, 15, 14, 0, 0, 0, 1, 2, 3, 1, 4, 4, 5, 5, 5, 5, 1, 6, 21, 4, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 7, 90, 6, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 0, 12, 97, 115, 99, 105, 105, 95, 108, 101, 110, 103, 116, 104, 0, 1, 12, 117, 116, 102, 49, 54, 95, 108, 101, 110, 103, 116, 104, 0, 2, 13, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 49, 54, 0, 3, 18, 112, 97, 114, 115, 101, 95, 97, 115, 99, 105, 105, 95, 112, 114, 101, 102, 105, 120, 0, 6, 10, 151, 16, 14, 4, 0, 35, 0, 11, 4, 0, 35, 2, 11, 4, 0, 35, 3, 11, 216, 7, 5, 1, 127, 2, 123, 2, 127, 2, 123, 3, 127, 65, 34, 253, 15, 33, 9, 65, 0, 36, 0, 65, 0, 36, 2, 65, 0, 36, 3, 65, 128, 1, 253, 15, 33, 4, 65, 0, 253, 15, 33, 5, 32, 0, 32, 1, 65, 127, 16, 6, 34, 7, 32, 0, 75, 4, 64, 32, 7, 32, 0, 107, 33, 3, 35, 1, 4, 64, 32, 3, 36, 2, 65, 1, 36, 0, 35, 1, 15, 11, 32, 7, 32, 1, 70, 4, 64, 65, 127, 15, 11, 32, 0, 32, 7, 32, 2, 16, 4, 32, 7, 33, 0, 32, 2, 32, 3, 65, 1, 116, 106, 33, 2, 11, 2, 64, 3, 64, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 0, 32, 1, 32, 2, 16, 6, 33, 7, 32, 2, 32, 7, 32, 0, 107, 65, 1, 116, 106, 33, 2, 32, 3, 32, 7, 32, 0, 107, 106, 33, 3, 32, 7, 33, 0, 35, 1, 4, 64, 32, 3, 36, 2, 32, 2, 36, 3, 32, 0, 15, 11, 11, 32, 0, 45, 0, 0, 34, 7, 65, 224, 1, 73, 4, 64, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 8, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 10, 32, 10, 65, 255, 255, 3, 70, 4, 64, 32, 2, 32, 8, 16, 5, 253, 11, 4, 0, 32, 0, 65, 16, 106, 33, 0, 32, 2, 65, 16, 106, 33, 2, 12, 2, 11, 32, 10, 65, 255, 255, 3, 115, 104, 33, 11, 32, 11, 65, 32, 70, 4, 64, 65, 16, 33, 12, 5, 32, 11, 33, 12, 11, 32, 12, 69, 13, 4, 32, 2, 32, 8, 16, 5, 253, 11, 4, 0, 32, 0, 32, 12, 106, 33, 0, 32, 2, 32, 12, 106, 33, 2, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 2, 32, 0, 45, 0, 0, 59, 1, 0, 32, 0, 65, 1, 106, 33, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 1, 106, 33, 3, 11, 12, 1, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 70, 69, 13, 1, 32, 6, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 13, 4, 64, 32, 2, 32, 6, 16, 10, 54, 2, 0, 32, 0, 65, 4, 106, 33, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 40, 0, 0, 33, 6, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 12, 1, 11, 32, 2, 32, 6, 16, 9, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 3, 11, 11, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 1, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 6, 65, 143, 192, 0, 113, 69, 32, 6, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 2, 32, 6, 16, 11, 54, 2, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 2, 11, 11, 32, 6, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 6, 65, 255, 255, 3, 113, 65, 8, 16, 8, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 13, 4, 64, 32, 2, 32, 6, 16, 12, 54, 2, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 12, 1, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 34, 7, 65, 255, 0, 77, 4, 64, 32, 7, 65, 34, 70, 4, 64, 32, 0, 32, 0, 16, 7, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 36, 2, 32, 0, 15, 11, 11, 32, 2, 32, 7, 59, 1, 0, 32, 0, 65, 1, 106, 33, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 1, 106, 33, 3, 12, 1, 11, 32, 7, 65, 224, 1, 73, 4, 64, 32, 0, 65, 1, 106, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 4, 64, 65, 127, 15, 11, 32, 2, 32, 7, 65, 31, 113, 65, 6, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 1, 11, 32, 7, 65, 240, 1, 73, 4, 64, 32, 0, 65, 2, 106, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 32, 0, 65, 2, 106, 45, 0, 0, 65, 191, 1, 75, 114, 4, 64, 65, 127, 15, 11, 32, 2, 32, 7, 65, 15, 113, 65, 12, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 1, 11, 11, 11, 65, 127, 11, 127, 2, 1, 127, 1, 123, 65, 0, 33, 3, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 75, 13, 1, 32, 0, 32, 3, 106, 253, 0, 4, 0, 33, 4, 32, 2, 32, 4, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 2, 32, 4, 253, 138, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 2, 64, 3, 64, 32, 3, 65, 1, 106, 32, 1, 75, 13, 1, 32, 2, 32, 0, 32, 3, 106, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 12, 0, 11, 11, 11, 76, 1, 2, 123, 32, 0, 253, 12, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 253, 78, 33, 1, 32, 1, 65, 6, 253, 139, 1, 33, 1, 32, 0, 65, 8, 253, 141, 1, 33, 2, 32, 2, 253, 12, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 253, 78, 33, 2, 32, 1, 32, 2, 253, 80, 11, 241, 3, 2, 4, 127, 3, 123, 65, 0, 36, 1, 65, 128, 1, 253, 15, 33, 8, 65, 34, 253, 15, 33, 9, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 7, 65, 0, 253, 15, 253, 43, 253, 100, 33, 6, 32, 6, 65, 255, 255, 3, 115, 104, 33, 5, 32, 5, 65, 32, 70, 4, 64, 65, 16, 33, 4, 5, 32, 5, 33, 4, 11, 32, 7, 32, 9, 253, 35, 253, 100, 4, 64, 32, 0, 32, 0, 32, 4, 106, 16, 7, 34, 3, 65, 0, 79, 4, 64, 32, 3, 36, 1, 32, 0, 32, 3, 107, 33, 4, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 7, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 32, 7, 253, 138, 1, 253, 11, 4, 0, 32, 2, 32, 4, 65, 1, 116, 106, 33, 2, 11, 32, 3, 15, 11, 11, 32, 4, 69, 4, 64, 32, 0, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 7, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 32, 7, 253, 138, 1, 253, 11, 4, 0, 32, 2, 32, 4, 65, 1, 116, 106, 33, 2, 11, 32, 0, 32, 4, 106, 33, 0, 32, 4, 65, 16, 70, 13, 1, 32, 0, 15, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 128, 129, 130, 132, 120, 113, 65, 0, 70, 4, 64, 32, 0, 32, 0, 65, 4, 106, 16, 7, 34, 3, 65, 0, 74, 4, 64, 32, 3, 36, 1, 32, 2, 65, 127, 74, 4, 64, 32, 6, 253, 17, 33, 7, 32, 7, 253, 137, 1, 33, 7, 32, 2, 32, 7, 253, 91, 3, 0, 0, 32, 2, 65, 8, 106, 33, 2, 11, 32, 3, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 6, 253, 17, 33, 7, 32, 7, 253, 137, 1, 33, 7, 32, 2, 32, 7, 253, 91, 3, 0, 0, 32, 2, 65, 8, 106, 33, 2, 11, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 6, 32, 6, 65, 128, 1, 79, 4, 64, 32, 0, 15, 11, 32, 6, 65, 34, 70, 32, 0, 32, 0, 16, 7, 34, 3, 65, 0, 74, 113, 4, 64, 32, 3, 36, 1, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 6, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 11, 32, 3, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 6, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 15, 11, 11, 32, 0, 15, 11, 102, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 1, 107, 116, 114, 11, 30, 0, 32, 0, 65, 8, 118, 65, 255, 1, 113, 32, 0, 65, 255, 1, 113, 65, 6, 116, 106, 65, 128, 224, 0, 107, 65, 128, 1, 107, 11, 26, 0, 32, 0, 65, 128, 254, 128, 248, 3, 113, 65, 8, 118, 32, 0, 65, 159, 128, 252, 0, 113, 65, 6, 116, 114, 11, 33, 0, 32, 0, 65, 128, 128, 252, 1, 113, 65, 16, 118, 32, 0, 65, 128, 254, 0, 113, 65, 2, 118, 114, 32, 0, 65, 15, 113, 65, 12, 116, 114, 11, 137, 1, 1, 3, 127, 32, 0, 65, 255, 1, 113, 33, 2, 32, 2, 65, 8, 116, 33, 3, 32, 3, 33, 1, 32, 0, 65, 128, 254, 0, 113, 65, 6, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 192, 1, 113, 65, 20, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 128, 248, 3, 113, 65, 8, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 60, 113, 65, 6, 116, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 1, 65, 192, 0, 107, 33, 1, 32, 1, 65, 128, 192, 0, 107, 33, 1, 32, 1, 65, 128, 16, 106, 33, 1, 32, 1, 65, 128, 128, 128, 224, 125, 106, 15, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 77, 11
            ]), memory)

            if (utf16Module) {
                const get_dq_index = utf16Module.dq_index
                const get_ascii_only = utf16Module.ascii_only
                const get_utf16_length = utf16Module.utf16_length
                const utf8_to_utf16 = utf16Module.utf8_to_utf16

                return (ctx: ParseContext, i: number): ReadResult<string> => {
                    const reader = ctx.reader
                    const b = reader.bytes
                    const stack = ctx.stack

                    let isContinued: boolean = false
                    let chunk: string = ''

                    const state = stack.pop()
                    if (state !== undefined) {
                        isContinued = state.isContinued
                        chunk = state.chunk
                    }

                    let start = i
                    let end = b.length
                    let length = end - start

                    const max_length = length * 3

                    if (ensureMemory(memory, max_length, setView)) {
                        memoryView.set(new Uint8Array(b.buffer, start, length))

                        const end_index = utf8_to_utf16(0, length, length + 1)
                        const dq_index = get_dq_index()
                        const ascii_only = get_ascii_only()

                        if (dq_index === -1) {
                            if (end_index >= b.length && reader.writable) {
                                const utf16_end = get_utf16_length()
                                stack.push({
                                    isContinued: true,
                                    chunk: ascii_only === 1 ? utf8(0, end_index) : utf16(length + 1, utf16_end)
                                })
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

                        if (ascii_only === 1) {
                            return {
                                type: COMPLETE,
                                value: !isContinued ? utf8(0, end_index) : chunk.concat(utf8(0, end_index)),
                                nextIndex: end_index + 1
                            }
                        }

                        const utf16_end = get_utf16_length()
                        return {
                            type: COMPLETE,
                            value: !isContinued ? utf16(length + 1, utf16_end) : chunk.concat(utf16(length + 1, utf16_end)),
                            nextIndex: end_index + 1
                        }
                    }

                    ensureMemory(memory, MAX_MEMORY, setView)

                    length = Math.min(MAX_MEMORY / 3, length)

                    let ch = ''
                    while (true) {
                        memoryView.set(new Uint8Array(b.buffer, start, length))

                        const index = utf8_to_utf16(0, length, length + 1)
                        const dq_index = get_dq_index()
                        const ascii_only = get_ascii_only()

                        if (dq_index === -1) {
                            // if(last chunk) {}
                            if (reader.writable) {
                                stack.push({
                                    isContinued: true,
                                    chunk: ascii_only === 1 ? utf8(start, index) : utf16(end + 1, index)
                                })
                                return {
                                    type: NEEDS_MORE_DATA,
                                    nextIndex: index
                                }
                            }
                            return {
                                type: ERROR,
                                error: new JSONParseError('')
                            }
                        }

                        if (ascii_only === 1) {
                            return {
                                type: COMPLETE,
                                value: ch.concat(utf8(start, index)),
                                nextIndex: index + 1
                            }
                        }

                        const utf16_end = get_utf16_length()
                        return {
                            type: COMPLETE,
                            value: ch.concat(utf16(end + 1, utf16_end)),
                            nextIndex: index + 1
                        }
                    }
                }
            }
        }

        const utf8Module = wasmInstance<UTF8Module>(new Uint8Array([

        ]), memory)

        if (utf8Module) {
            const get_dq_index = utf8Module.dq_index
            const try_find_end_of_string = utf8Module.try_find_end_of_string

            return (ctx: ParseContext, i: number): ReadResult<string> => {
                const reader = ctx.reader
                const b = reader.bytes
                const stack = ctx.stack

                let isContinued: boolean = false
                let chunk: string = ''

                const state = stack.pop()
                if (state !== undefined) {
                    isContinued = state.isContinued
                    chunk = state.chunk
                }

                let start = i
                let end = b.length
                let length = end - start

                if (ensureMemory(memory, length, setView)) {
                    memoryView.set(new Uint8Array(b.buffer, start, length))

                    const end_index = try_find_end_of_string(i)
                    const dq_index = get_dq_index()

                    if (dq_index === -1) {
                        if (i >= b.length && end_index > i && reader.writable) {
                            stack.push({
                                isContinued: true,
                                chunk: utf8(i, end_index)
                            })
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

                    return {
                        type: COMPLETE,
                        value: utf8(0, end_index),
                        nextIndex: end_index + 1
                    }
                }

                ensureMemory(memory, MAX_MEMORY, setView)

                while (true) {
                    memoryView.set(new Uint8Array(b.buffer, start, Math.min(MAX_MEMORY, b.length - start)))

                    const end_index = try_find_end_of_string(i)
                    const dq_index = get_dq_index()

                    chunk = chunk.concat(utf8(0, end_index))
                    start += end_index

                    if (dq_index === -1) {
                        if (start >= b.length && reader.writable) {
                            stack.push({
                                isContinued: true,
                                chunk
                            })
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

                    return {
                        type: COMPLETE,
                        value: chunk,
                        nextIndex: dq_index + 1
                    }
                }
            }
        }

        return (ctx: ParseContext, i: number): ReadResult<string> => {
            return {
                type: COMPLETE,
                value: utf8(i, i + 1),
                nextIndex: i + 1
            }
        }
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

    const decode = decodeFactory(options)

    const toString = (m: PrimitiveMeta<string>, context: ParseContext, index: number, depth: number): ReadResult<string> => {
        const reader = context.reader
        const stack = context.stack

        let isContinued: boolean = false
        let chunk: string = ''

        const state = stack.peek()
        if (state !== undefined) {
            isContinued = state.isContinued
            chunk = state.chunk
        }

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

        return decode(context, i)
    }

    return {
        toString
    }
}

export function toString(
    m: PrimitiveMeta<string>,
    context: ParseContext,
    index: number,
    depth: number
): ReadResult<string> {
    const reader = context.reader
    const b = reader.bytes

    let isContinued: boolean

    const stack = context.stack
    const state = stack.pop()

    if (state !== undefined) {
        isContinued = state.isContinued
    }
    else {
        isContinued = false
    }

    let i = index
    if (b[i] !== DQ) {
        if (i >= b.length && reader.writable)
            return {
                type: NEEDS_MORE_DATA,
                nextIndex: i
            }

        if (i < b.length && !isContinued)
            throw new Error(`Expected " at index ${i}, but found '${b[i]}' while parsing string`)
    }
    else i++

    return decode(reader, i)
}

type UseDecode = {
    readonly options: ParserOptions,
    readonly module: UTF16Module
}

function useDecoder(options: ParserOptions) {
    try {
        const wasmMemory = new WebAssembly.Memory({
            initial: options.initialWasmMemoryPages,
            maximum: options.maxWasmMemoryPages
        })

        const instance = new WebAssembly.Instance(
            new WebAssembly.Module(
                new Uint8Array([
                    0, 97, 115, 109, 1, 0, 0, 0, 1, 34, 6, 96, 0, 1, 127, 96, 3, 127, 127, 127, 1, 127, 96, 3, 127, 127, 127, 0, 96, 1, 123, 1, 123, 96, 2, 127, 127, 1, 127, 96, 1, 127, 1, 127, 2, 17, 1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, 1, 128, 1, 3, 15, 14, 0, 0, 0, 1, 2, 3, 1, 4, 4, 5, 5, 5, 5, 1, 6, 21, 4, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 7, 90, 6, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 0, 12, 97, 115, 99, 105, 105, 95, 108, 101, 110, 103, 116, 104, 0, 1, 12, 117, 116, 102, 49, 54, 95, 108, 101, 110, 103, 116, 104, 0, 2, 13, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 49, 54, 0, 3, 18, 112, 97, 114, 115, 101, 95, 97, 115, 99, 105, 105, 95, 112, 114, 101, 102, 105, 120, 0, 6, 10, 151, 16, 14, 4, 0, 35, 0, 11, 4, 0, 35, 2, 11, 4, 0, 35, 3, 11, 216, 7, 5, 1, 127, 2, 123, 2, 127, 2, 123, 3, 127, 65, 34, 253, 15, 33, 9, 65, 0, 36, 0, 65, 0, 36, 2, 65, 0, 36, 3, 65, 128, 1, 253, 15, 33, 4, 65, 0, 253, 15, 33, 5, 32, 0, 32, 1, 65, 127, 16, 6, 34, 7, 32, 0, 75, 4, 64, 32, 7, 32, 0, 107, 33, 3, 35, 1, 4, 64, 32, 3, 36, 2, 65, 1, 36, 0, 35, 1, 15, 11, 32, 7, 32, 1, 70, 4, 64, 65, 127, 15, 11, 32, 0, 32, 7, 32, 2, 16, 4, 32, 7, 33, 0, 32, 2, 32, 3, 65, 1, 116, 106, 33, 2, 11, 2, 64, 3, 64, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 0, 32, 1, 32, 2, 16, 6, 33, 7, 32, 2, 32, 7, 32, 0, 107, 65, 1, 116, 106, 33, 2, 32, 3, 32, 7, 32, 0, 107, 106, 33, 3, 32, 7, 33, 0, 35, 1, 4, 64, 32, 3, 36, 2, 32, 2, 36, 3, 32, 0, 15, 11, 11, 32, 0, 45, 0, 0, 34, 7, 65, 224, 1, 73, 4, 64, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 8, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 10, 32, 10, 65, 255, 255, 3, 70, 4, 64, 32, 2, 32, 8, 16, 5, 253, 11, 4, 0, 32, 0, 65, 16, 106, 33, 0, 32, 2, 65, 16, 106, 33, 2, 12, 2, 11, 32, 10, 65, 255, 255, 3, 115, 104, 33, 11, 32, 11, 65, 32, 70, 4, 64, 65, 16, 33, 12, 5, 32, 11, 33, 12, 11, 32, 12, 69, 13, 4, 32, 2, 32, 8, 16, 5, 253, 11, 4, 0, 32, 0, 32, 12, 106, 33, 0, 32, 2, 32, 12, 106, 33, 2, 32, 0, 45, 0, 0, 65, 128, 1, 73, 4, 64, 32, 2, 32, 0, 45, 0, 0, 59, 1, 0, 32, 0, 65, 1, 106, 33, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 1, 106, 33, 3, 11, 12, 1, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 70, 69, 13, 1, 32, 6, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 13, 4, 64, 32, 2, 32, 6, 16, 10, 54, 2, 0, 32, 0, 65, 4, 106, 33, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 40, 0, 0, 33, 6, 32, 0, 65, 4, 106, 32, 1, 75, 13, 4, 12, 1, 11, 32, 2, 32, 6, 16, 9, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 3, 11, 11, 11, 32, 0, 65, 4, 106, 32, 1, 75, 13, 1, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 6, 65, 143, 192, 0, 113, 69, 32, 6, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 2, 32, 6, 16, 11, 54, 2, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 2, 11, 11, 32, 6, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 6, 65, 255, 255, 3, 113, 65, 8, 16, 8, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 13, 4, 64, 32, 2, 32, 6, 16, 12, 54, 2, 0, 32, 2, 65, 4, 106, 33, 2, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 12, 1, 11, 11, 2, 64, 3, 64, 32, 0, 65, 1, 106, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 34, 7, 65, 255, 0, 77, 4, 64, 32, 7, 65, 34, 70, 4, 64, 32, 0, 32, 0, 16, 7, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 36, 2, 32, 0, 15, 11, 11, 32, 2, 32, 7, 59, 1, 0, 32, 0, 65, 1, 106, 33, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 1, 106, 33, 3, 12, 1, 11, 32, 7, 65, 224, 1, 73, 4, 64, 32, 0, 65, 1, 106, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 4, 64, 65, 127, 15, 11, 32, 2, 32, 7, 65, 31, 113, 65, 6, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 2, 106, 33, 0, 12, 1, 11, 32, 7, 65, 240, 1, 73, 4, 64, 32, 0, 65, 2, 106, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 0, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 32, 0, 65, 2, 106, 45, 0, 0, 65, 191, 1, 75, 114, 4, 64, 65, 127, 15, 11, 32, 2, 32, 7, 65, 15, 113, 65, 12, 116, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 0, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 0, 65, 3, 106, 33, 0, 12, 1, 11, 11, 11, 65, 127, 11, 127, 2, 1, 127, 1, 123, 65, 0, 33, 3, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 75, 13, 1, 32, 0, 32, 3, 106, 253, 0, 4, 0, 33, 4, 32, 2, 32, 4, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 2, 32, 4, 253, 138, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 2, 64, 3, 64, 32, 3, 65, 1, 106, 32, 1, 75, 13, 1, 32, 2, 32, 0, 32, 3, 106, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 12, 0, 11, 11, 11, 76, 1, 2, 123, 32, 0, 253, 12, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 253, 78, 33, 1, 32, 1, 65, 6, 253, 139, 1, 33, 1, 32, 0, 65, 8, 253, 141, 1, 33, 2, 32, 2, 253, 12, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 253, 78, 33, 2, 32, 1, 32, 2, 253, 80, 11, 241, 3, 2, 4, 127, 3, 123, 65, 0, 36, 1, 65, 128, 1, 253, 15, 33, 8, 65, 34, 253, 15, 33, 9, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 73, 4, 64, 32, 0, 253, 0, 4, 0, 34, 7, 65, 0, 253, 15, 253, 43, 253, 100, 33, 6, 32, 6, 65, 255, 255, 3, 115, 104, 33, 5, 32, 5, 65, 32, 70, 4, 64, 65, 16, 33, 4, 5, 32, 5, 33, 4, 11, 32, 7, 32, 9, 253, 35, 253, 100, 4, 64, 32, 0, 32, 0, 32, 4, 106, 16, 7, 34, 3, 65, 0, 79, 4, 64, 32, 3, 36, 1, 32, 0, 32, 3, 107, 33, 4, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 7, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 32, 7, 253, 138, 1, 253, 11, 4, 0, 32, 2, 32, 4, 65, 1, 116, 106, 33, 2, 11, 32, 3, 15, 11, 11, 32, 4, 69, 4, 64, 32, 0, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 7, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 32, 7, 253, 138, 1, 253, 11, 4, 0, 32, 2, 32, 4, 65, 1, 116, 106, 33, 2, 11, 32, 0, 32, 4, 106, 33, 0, 32, 4, 65, 16, 70, 13, 1, 32, 0, 15, 11, 32, 0, 65, 4, 106, 32, 1, 73, 4, 64, 32, 0, 40, 0, 0, 33, 6, 32, 6, 65, 128, 129, 130, 132, 120, 113, 65, 0, 70, 4, 64, 32, 0, 32, 0, 65, 4, 106, 16, 7, 34, 3, 65, 0, 74, 4, 64, 32, 3, 36, 1, 32, 2, 65, 127, 74, 4, 64, 32, 6, 253, 17, 33, 7, 32, 7, 253, 137, 1, 33, 7, 32, 2, 32, 7, 253, 91, 3, 0, 0, 32, 2, 65, 8, 106, 33, 2, 11, 32, 3, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 6, 253, 17, 33, 7, 32, 7, 253, 137, 1, 33, 7, 32, 2, 32, 7, 253, 91, 3, 0, 0, 32, 2, 65, 8, 106, 33, 2, 11, 32, 0, 65, 4, 106, 33, 0, 12, 2, 11, 11, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 6, 32, 6, 65, 128, 1, 79, 4, 64, 32, 0, 15, 11, 32, 6, 65, 34, 70, 32, 0, 32, 0, 16, 7, 34, 3, 65, 0, 74, 113, 4, 64, 32, 3, 36, 1, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 6, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 11, 32, 3, 15, 11, 32, 2, 65, 127, 74, 4, 64, 32, 2, 32, 6, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 15, 11, 11, 32, 0, 15, 11, 102, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 75, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 1, 107, 116, 114, 11, 30, 0, 32, 0, 65, 8, 118, 65, 255, 1, 113, 32, 0, 65, 255, 1, 113, 65, 6, 116, 106, 65, 128, 224, 0, 107, 65, 128, 1, 107, 11, 26, 0, 32, 0, 65, 128, 254, 128, 248, 3, 113, 65, 8, 118, 32, 0, 65, 159, 128, 252, 0, 113, 65, 6, 116, 114, 11, 33, 0, 32, 0, 65, 128, 128, 252, 1, 113, 65, 16, 118, 32, 0, 65, 128, 254, 0, 113, 65, 2, 118, 114, 32, 0, 65, 15, 113, 65, 12, 116, 114, 11, 137, 1, 1, 3, 127, 32, 0, 65, 255, 1, 113, 33, 2, 32, 2, 65, 8, 116, 33, 3, 32, 3, 33, 1, 32, 0, 65, 128, 254, 0, 113, 65, 6, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 192, 1, 113, 65, 20, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 128, 248, 3, 113, 65, 8, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 60, 113, 65, 6, 116, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 1, 65, 192, 0, 107, 33, 1, 32, 1, 65, 128, 192, 0, 107, 33, 1, 32, 1, 65, 128, 16, 106, 33, 1, 32, 1, 65, 128, 128, 128, 224, 125, 106, 15, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 77, 11
                ])
            ),
            { env: { memory: wasmMemory } })

        const module = instance.exports as UTF16Module

        const PAGE_SIZE_BYTES = 65536

        const ensureMemory = (parent: UseDecode, requiredLength: number): boolean => {
            try {
                const module = parent.module
                const maxPagesCount = parent.options.maxWasmMemoryPages

                const currentLength = module.memory.buffer.byteLength

                if (requiredLength > currentLength) {
                    const pages = currentLength / PAGE_SIZE_BYTES
                    const requiredPages = Math.ceil(requiredLength / PAGE_SIZE_BYTES)

                    if (requiredPages > maxPagesCount)
                        return false

                    module.memory.grow(requiredPages - pages)
                    memory = new Uint8Array(module.memory.buffer)
                    return true
                }
                return true
            }
            catch (error) {
                console.error(error)
                return false
            }
        }

        const unsafeDecoder8 = new TextDecoder('utf-8', { fatal: false })
        const unsafeDecoder16 = new TextDecoder('utf-16le', { fatal: false })

        let memory = new Uint8Array(module.memory.buffer)
        const buffer = Buffer.from(module.memory.buffer)

        const get_ascii_only = module.ascii_only
        const get_utf16_length = module.utf16_length

        let set: Uint8Array | undefined

        const current = { module: module, options: options }

        function decode(reader: JsonReader, i: number): ReadResult<string> {
            const b = reader.bytes
            const dataLength = b.length
            const multipleOfTwo = (dataLength + 1) & ~1

            if (ensureMemory(current, multipleOfTwo)) {
                if (set !== b) {
                    memory.set(b)
                }

                const index = module.utf8_to_utf16(i, dataLength, multipleOfTwo)
                if (index === -1) {
                    if (!reader.writable) throw new Error('invalid string value')
                    return {} as any
                }

                const ascii_only = get_ascii_only()

                if (ascii_only === 1) {
                    const ascii_length = index - i

                    if (ascii_length <= 64) {
                        const factory = factories[ascii_length]
                        return {
                            type: COMPLETE,
                            value: factory(b, i),
                            nextIndex: index + 1
                        }
                    }

                    return {
                        type: COMPLETE,
                        value: buffer.toString('utf8', i, ascii_length),
                        nextIndex: index + 1
                    }
                }

                const utf16_end = get_utf16_length()
                const utf16Length = utf16_end - multipleOfTwo

                return {
                    type: COMPLETE,
                    value: buffer.toString('utf16le', multipleOfTwo, utf16Length),
                    nextIndex: index + 1
                }
            }

            return {} as any
        }

        return {
            decode: decode
        }
    } catch (error) {
        console.error(error)
    }

    function decode(reader: JsonReader, i: number): ReadResult<string> {
        const b = reader.bytes
        const len = b.length

        while (i < len && (i & 3)) {
            if (b[i] === DQ) {

            }
            i++
        }

        const u32 = new Uint32Array(b.buffer, i, Math.floor((len - i) / 4))
        const len32 = u32.length

        let j = 0
        const quote_mask = 0x22222222
        while (j < len32 - 4) {
            const x1 = u32[j] ^ quote_mask
            const x2 = u32[j + 1] ^ quote_mask
            const x3 = u32[j + 2] ^ quote_mask
            const x4 = u32[j + 3] ^ quote_mask

            const c = (x1 & x2 & x3 & x4)

            if ((((c - 0x01010101) ^ c) & 0x80808080) !== 0)
                break

            j += 4
        }

        while (j < len32) {
            const x1 = u32[j] ^ quote_mask

            if ((((x1 - 0x01010101) ^ x1) & 0x80808080) !== 0) {
                i = i + j * 4
            }

            j++
        }

        i = i + j * 4
        while (i < len) {
            if (b[i] === DQ) {

            }
            i++
        }

        throw new Error('')
    }

    return {
        decode: decode
    }
}

const maxcount = 64
const factories = new Array<(data: ArrayLike<number>, i: number) => string>(maxcount)
factories[0] = (_a, _i) => ""
for (let i = 1; i <= maxcount; i++) {
    factories[i] = genUnrolledFromCharCode(i)
}
