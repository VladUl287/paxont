import { JsonReader, PrimitiveMeta } from "../metadata/types"
import { TypedArray } from "../utils/typedArray"
import { ReadResult } from "../utils/types"
import { DOUBLE_QUOTE } from "../utils/utf8constants"

const { decode: decodeSlow } = useDecode()

export function tryParseString(
    reader: JsonReader,
    m: PrimitiveMeta<string>,
    i: number,
    d: number,
    state: {
        isContinued?: boolean
    }
): ReadResult<string> {
    const b = reader.bytes

    if (b[i] !== DOUBLE_QUOTE) {
        if (i >= b.length && reader.writable)
            return { nextIndex: i }

        if (i < b.length && !state.isContinued)
            throw new Error(`Expected " at index ${i}, but found '${b[i]}' while parsing string`)
    }
    else i++

    return decodeSlow(reader, i)

    let start = i
    i = findNext(b, i, DOUBLE_QUOTE)

    if (i === -1)
        throw new Error(`Unterminated string literal starting at index ${start}: missing closing quote (")`)

    return {
        value: decode(b, start, i),
        nextIndex: ++i
    }
}

function useDecode() {
    try {
        type DecodeModule = {
            memory: WebAssembly.Memory
            ascii_only: () => number
            ascii_length: () => number
            ascii_prefix_length: () => number
            utf16_length: () => number
            utf8_to_utf16: (index: number, length: number, target: number) => number
        }

        const instance = new WebAssembly.Instance(
            new WebAssembly.Module(
                new Uint8Array([
                    0, 97, 115, 109, 1, 0, 0, 0, 1, 28, 5, 96, 0, 1, 127, 96, 3, 127, 127, 127, 1, 127, 96, 1, 123, 1, 123, 96, 2, 127, 127, 1, 127, 96, 1, 127, 1, 127, 3, 15, 14, 0, 0, 0, 0, 1, 2, 3, 3, 3, 4, 4, 4, 4, 1, 5, 5, 1, 1, 1, 128, 1, 6, 21, 4, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 127, 1, 65, 0, 11, 7, 91, 6, 6, 109, 101, 109, 111, 114, 121, 2, 0, 10, 97, 115, 99, 105, 105, 95, 111, 110, 108, 121, 0, 0, 12, 97, 115, 99, 105, 105, 95, 108, 101, 110, 103, 116, 104, 0, 1, 19, 97, 115, 99, 105, 105, 95, 112, 114, 101, 102, 105, 120, 95, 108, 101, 110, 103, 116, 104, 0, 2, 12, 117, 116, 102, 49, 54, 95, 108, 101, 110, 103, 116, 104, 0, 3, 13, 117, 116, 102, 56, 95, 116, 111, 95, 117, 116, 102, 49, 54, 0, 4, 10, 172, 15, 14, 4, 0, 35, 0, 11, 4, 0, 35, 1, 11, 4, 0, 35, 2, 11, 4, 0, 35, 3, 11, 233, 9, 7, 2, 127, 3, 123, 2, 127, 1, 123, 1, 127, 1, 123, 2, 127, 65, 0, 36, 0, 65, 0, 36, 1, 65, 0, 36, 2, 65, 0, 36, 3, 65, 34, 253, 15, 33, 7, 32, 0, 33, 3, 65, 128, 1, 253, 15, 33, 5, 65, 0, 253, 15, 33, 6, 32, 3, 32, 1, 16, 6, 34, 4, 4, 64, 35, 0, 4, 64, 32, 4, 36, 1, 32, 4, 36, 2, 32, 4, 15, 11, 32, 4, 32, 1, 70, 4, 64, 65, 127, 15, 11, 11, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 4, 75, 13, 1, 32, 3, 253, 0, 4, 0, 33, 10, 32, 2, 32, 10, 253, 137, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 2, 32, 10, 253, 138, 1, 253, 11, 4, 0, 32, 2, 65, 16, 106, 33, 2, 32, 3, 65, 16, 106, 33, 3, 12, 0, 11, 11, 2, 64, 3, 64, 32, 3, 65, 1, 106, 32, 4, 75, 13, 1, 32, 2, 32, 3, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 12, 0, 11, 11, 2, 64, 3, 64, 32, 3, 65, 4, 106, 32, 1, 75, 13, 1, 32, 3, 40, 0, 0, 33, 8, 32, 8, 65, 128, 129, 130, 132, 120, 113, 65, 0, 70, 4, 64, 32, 8, 65, 162, 196, 136, 145, 2, 115, 34, 9, 65, 129, 130, 132, 8, 107, 32, 9, 115, 65, 128, 129, 130, 132, 120, 113, 4, 64, 32, 3, 32, 3, 65, 4, 106, 16, 7, 33, 9, 32, 9, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 15, 11, 11, 32, 8, 253, 17, 33, 10, 32, 10, 253, 137, 1, 33, 12, 32, 2, 32, 12, 253, 91, 3, 0, 0, 32, 3, 65, 4, 106, 33, 3, 32, 3, 65, 8, 106, 33, 2, 32, 4, 65, 4, 106, 33, 4, 12, 1, 11, 32, 8, 65, 128, 1, 113, 69, 4, 64, 32, 8, 65, 255, 1, 113, 33, 9, 32, 9, 65, 34, 70, 4, 64, 32, 3, 32, 3, 16, 7, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 15, 11, 11, 32, 2, 32, 3, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 32, 4, 65, 1, 106, 33, 4, 32, 8, 65, 128, 128, 2, 113, 69, 4, 64, 32, 8, 65, 8, 118, 65, 255, 1, 113, 33, 9, 32, 9, 65, 34, 70, 4, 64, 32, 3, 32, 3, 16, 7, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 15, 11, 11, 32, 2, 32, 3, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 32, 4, 65, 1, 106, 33, 4, 32, 8, 65, 128, 128, 128, 4, 113, 69, 4, 64, 32, 8, 65, 16, 118, 65, 255, 1, 113, 33, 9, 32, 9, 65, 34, 70, 4, 64, 32, 3, 32, 3, 16, 7, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 15, 11, 11, 32, 2, 32, 3, 45, 0, 0, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 32, 4, 65, 1, 106, 33, 4, 11, 11, 32, 3, 40, 0, 0, 33, 8, 11, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 73, 4, 64, 32, 3, 253, 0, 4, 0, 34, 10, 253, 12, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 224, 192, 253, 78, 253, 12, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 192, 128, 253, 45, 253, 100, 33, 11, 32, 11, 65, 255, 255, 3, 115, 104, 33, 13, 32, 13, 65, 32, 70, 4, 64, 65, 16, 33, 14, 5, 32, 13, 33, 14, 11, 32, 14, 69, 13, 3, 32, 2, 32, 10, 16, 5, 253, 11, 4, 0, 32, 3, 32, 14, 106, 33, 3, 32, 2, 32, 14, 106, 33, 2, 12, 1, 11, 32, 3, 65, 4, 106, 32, 1, 75, 13, 3, 32, 8, 65, 192, 129, 2, 107, 65, 224, 129, 3, 113, 65, 0, 70, 69, 13, 1, 32, 8, 65, 128, 128, 252, 135, 124, 113, 65, 128, 128, 136, 134, 120, 65, 128, 128, 252, 134, 120, 16, 13, 4, 64, 32, 2, 32, 8, 16, 10, 54, 2, 0, 32, 3, 65, 4, 106, 33, 3, 32, 2, 65, 4, 106, 33, 2, 32, 3, 40, 0, 0, 33, 8, 32, 3, 65, 4, 106, 32, 1, 75, 13, 3, 12, 1, 11, 32, 2, 32, 8, 16, 9, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 2, 106, 33, 3, 12, 2, 11, 11, 32, 8, 65, 224, 129, 130, 4, 107, 65, 240, 129, 131, 6, 113, 65, 0, 70, 4, 64, 32, 8, 65, 143, 192, 0, 113, 69, 32, 8, 65, 141, 192, 0, 107, 65, 143, 192, 0, 113, 69, 114, 69, 4, 64, 32, 2, 32, 8, 16, 11, 54, 2, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 3, 106, 33, 3, 12, 2, 11, 11, 32, 8, 65, 240, 129, 130, 132, 120, 107, 65, 248, 129, 131, 134, 124, 113, 65, 0, 70, 4, 64, 32, 8, 65, 255, 255, 3, 113, 65, 8, 16, 8, 65, 144, 129, 128, 128, 127, 65, 143, 129, 128, 160, 127, 16, 13, 4, 64, 32, 2, 32, 8, 16, 12, 54, 2, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 3, 106, 33, 3, 12, 2, 11, 11, 12, 1, 11, 11, 2, 64, 3, 64, 32, 3, 65, 1, 106, 32, 1, 75, 13, 1, 32, 3, 45, 0, 0, 34, 9, 65, 255, 0, 77, 4, 64, 32, 9, 65, 34, 70, 4, 64, 32, 3, 32, 3, 16, 7, 65, 0, 79, 4, 64, 32, 2, 36, 3, 32, 3, 15, 11, 11, 32, 2, 32, 9, 59, 1, 0, 32, 3, 65, 1, 106, 33, 3, 32, 2, 65, 2, 106, 33, 2, 32, 4, 65, 1, 106, 33, 4, 12, 1, 11, 32, 9, 65, 224, 1, 73, 4, 64, 32, 3, 65, 1, 106, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 3, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 4, 64, 65, 127, 15, 11, 32, 2, 32, 9, 65, 31, 113, 65, 6, 116, 32, 3, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 2, 106, 33, 3, 12, 1, 11, 32, 9, 65, 240, 1, 73, 4, 64, 32, 3, 65, 2, 106, 32, 1, 79, 4, 64, 65, 127, 15, 11, 32, 3, 65, 1, 106, 45, 0, 0, 65, 191, 1, 75, 32, 3, 65, 2, 106, 45, 0, 0, 65, 191, 1, 75, 114, 4, 64, 65, 127, 15, 11, 32, 2, 32, 9, 65, 15, 113, 65, 12, 116, 32, 3, 65, 1, 106, 45, 0, 0, 65, 63, 113, 65, 6, 116, 114, 32, 3, 65, 1, 106, 45, 0, 0, 65, 63, 113, 114, 59, 1, 0, 32, 2, 65, 2, 106, 33, 2, 32, 3, 65, 3, 106, 33, 3, 12, 1, 11, 11, 11, 65, 127, 11, 76, 1, 2, 123, 32, 0, 253, 12, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 31, 0, 253, 78, 33, 1, 32, 1, 65, 6, 253, 139, 1, 33, 1, 32, 0, 65, 8, 253, 141, 1, 33, 2, 32, 2, 253, 12, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 63, 0, 253, 78, 33, 2, 32, 1, 32, 2, 253, 80, 11, 236, 1, 3, 1, 127, 3, 123, 4, 127, 32, 0, 33, 2, 65, 128, 1, 253, 15, 33, 4, 65, 34, 253, 15, 33, 5, 2, 64, 3, 64, 32, 0, 65, 16, 106, 32, 1, 75, 13, 1, 32, 0, 253, 0, 4, 0, 33, 3, 32, 3, 32, 4, 253, 44, 253, 100, 34, 6, 4, 64, 32, 0, 32, 6, 104, 106, 15, 11, 32, 3, 32, 5, 253, 35, 253, 100, 69, 4, 64, 32, 0, 65, 16, 106, 33, 0, 12, 1, 11, 32, 0, 32, 0, 65, 16, 106, 16, 7, 34, 7, 65, 0, 78, 4, 64, 65, 1, 36, 0, 32, 0, 32, 7, 106, 15, 11, 32, 0, 65, 16, 106, 33, 0, 12, 0, 11, 11, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 7, 32, 7, 65, 128, 1, 79, 4, 64, 32, 0, 15, 11, 32, 7, 65, 34, 70, 4, 64, 32, 0, 33, 8, 65, 0, 33, 9, 2, 64, 3, 64, 32, 8, 65, 1, 107, 33, 8, 32, 8, 32, 2, 72, 13, 1, 32, 8, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 9, 69, 33, 9, 12, 0, 11, 11, 32, 9, 69, 4, 64, 65, 1, 36, 0, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 32, 0, 11, 102, 1, 4, 127, 32, 0, 33, 2, 2, 64, 3, 64, 32, 0, 32, 1, 79, 13, 1, 32, 0, 45, 0, 0, 33, 3, 32, 3, 65, 34, 70, 4, 64, 32, 0, 33, 4, 65, 0, 33, 5, 2, 64, 3, 64, 32, 4, 65, 1, 107, 33, 4, 32, 4, 32, 2, 72, 13, 1, 32, 4, 45, 0, 0, 65, 220, 0, 71, 13, 1, 32, 5, 69, 33, 5, 12, 0, 11, 11, 32, 5, 69, 4, 64, 32, 0, 15, 11, 11, 32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 11, 65, 127, 11, 16, 0, 32, 0, 32, 1, 118, 32, 0, 65, 32, 32, 0, 107, 116, 114, 11, 30, 0, 32, 0, 65, 8, 118, 65, 255, 1, 113, 32, 0, 65, 255, 1, 113, 65, 6, 116, 106, 65, 128, 224, 0, 107, 65, 128, 1, 107, 11, 26, 0, 32, 0, 65, 128, 254, 128, 248, 3, 113, 65, 8, 118, 32, 0, 65, 159, 128, 252, 0, 113, 65, 6, 116, 114, 11, 33, 0, 32, 0, 65, 128, 128, 252, 1, 113, 65, 16, 118, 32, 0, 65, 128, 254, 0, 113, 65, 2, 118, 114, 32, 0, 65, 15, 113, 65, 12, 116, 114, 11, 141, 1, 1, 3, 127, 32, 0, 65, 255, 1, 113, 33, 2, 32, 2, 65, 8, 116, 33, 3, 32, 3, 33, 1, 32, 0, 65, 128, 254, 0, 113, 65, 6, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 192, 1, 113, 65, 20, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 128, 248, 3, 113, 65, 8, 118, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 0, 65, 128, 128, 60, 113, 65, 6, 116, 33, 3, 32, 1, 32, 3, 114, 33, 1, 32, 1, 65, 192, 0, 107, 33, 1, 32, 1, 65, 128, 192, 0, 107, 33, 1, 32, 1, 65, 128, 16, 106, 33, 1, 32, 1, 65, 128, 128, 128, 224, 125, 106, 33, 1, 32, 1, 15, 11, 13, 0, 32, 0, 32, 1, 107, 32, 2, 32, 1, 107, 76, 11
                ])
        ), {})

        const module = instance.exports as DecodeModule

        const PAGE_SIZE_BYTES = 65536
        const MAX_PAGES_COUNT = 128

        const ensureMemory = (module: DecodeModule, requiredLength: number): boolean => {
            try {
                const currentLength = module.memory.buffer.byteLength

                if (requiredLength > currentLength) {
                    const pages = requiredLength / PAGE_SIZE_BYTES
                    const requiredPages = Math.ceil(requiredLength / PAGE_SIZE_BYTES)

                    if (requiredPages > MAX_PAGES_COUNT)
                        return false

                    module.memory.grow(requiredPages - pages)
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

        const memory = new Uint8Array(module.memory.buffer)

        const get_ascii_only = module.ascii_only
        const get_ascii_length = module.ascii_length
        const get_ascii_prefix_length = module.ascii_prefix_length
        const get_utf16_length = module.utf16_length

        let set: Uint8Array | undefined

        const decode = (reader: JsonReader, i: number): ReadResult<string> => {
            const b = reader.bytes
            const dataLength = b.length

            if (ensureMemory(module, dataLength)) {
                if(set !== b) {
                    memory.set(b)
                }

                const index = module.utf8_to_utf16(i, dataLength, dataLength)
                if (index === -1) {
                    if (!reader.writable) throw new Error('invalid string value')
                    return {} as any
                }

                const ascii_only = get_ascii_only()
                const ascii_prefix_length = get_ascii_prefix_length()

                if (ascii_only === 1) {
                    if (ascii_prefix_length <= 64) {
                        const factory = factories[ascii_prefix_length - 1]

                        return {
                            value: factory(b, i),
                            nextIndex: index + 1
                        }
                    }

                    const view = new Uint8Array(b.buffer, i, index - 1)
                    return {
                        value: unsafeDecoder8.decode(view),
                        nextIndex: index + 1
                    }
                }

                const utf16_length = get_utf16_length()
                const utf16count = utf16_length - b.length
                if (utf16count <= 64) {
                    const factory = factories[utf16count]

                    const view = new Uint16Array(memory.buffer, b.length, utf16count)
                    return {
                        value: factory(view, 0),
                        nextIndex: index + 1
                    }
                }

                const view = new Uint8Array(memory.buffer, b.length, utf16count)
                return {
                    value: unsafeDecoder16.decode(view),
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
        return {} as any
    }

    return {
        decode: decode
    }
}

function genUnrolledFromCharCode(length: number): (data: TypedArray, i: number) => string {
    return new Function('a', 'i', `return String.fromCharCode(${new Array(length).fill(0).map((_, i) => `a[i + ${i}]`)})`) as any
}

const maxcount = 128
const factories = new Array<(data: TypedArray, i: number) => string>(maxcount)
for (let i = 1; i <= maxcount; i++) {
    factories[i] = genUnrolledFromCharCode(i)
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

                const PAGE_SIZE_BYTES = 65536
                const MAX_PAGES_COUNT = 128 //(6.4KB)

                const memory = (module: WasmModule, src: Uint8Array) => {
                    if (ref === src)
                        return true

                    const minLength = src.length

                    if (view.length < minLength) {
                        const pages = view.length / PAGE_SIZE_BYTES
                        const requiredPages = Math.ceil(minLength / PAGE_SIZE_BYTES)

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
    let j = 0

    wasmU8.set(b.subarray(i))

    // let index = wasm.utf8_to_utf16(0, b.length, 0)
    let index = 1000

    const length = (index / 4) + 1
    const result = (TEMP_CACHE[length] ??= new Array<number>(length))

    while (j < length) {
        result[j] = wasmU16[j]
        j++
    }

    return String.fromCharCode.apply(String, result)

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
