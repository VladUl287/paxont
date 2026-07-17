import { genUnrolledFromCharCode } from "../code_gen/string"
import { JsonReader, PrimitiveMeta } from "../metadata/types"
import { IS_NODE } from "../utils/platform"
import { ReadResult } from "../utils/types"
import { DOUBLE_QUOTE as DQ } from "../utils/utf8constants"

const { decode } = useDecoder({
    initialWasmMemoryPages: 1, //~64KiB
    maxWasmMemoryPages: 128, //~8MiB,
    isNode: IS_NODE
})

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

    if (b[i] !== DQ) {
        if (i >= b.length && reader.writable)
            return { nextIndex: i }

        if (i < b.length && !state.isContinued)
            throw new Error(`Expected " at index ${i}, but found '${b[i]}' while parsing string`)
    }
    else i++

    return decode(reader, i)
}

type DecodeModule = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly ascii_length: () => number
    readonly utf16_length: () => number
    readonly utf8_to_utf16: (index: number, length: number, target: number) => number
    readonly parse_ascii_prefix: (index: number, length: number, target: number) => number
}

type UseDecodeOptions = {
    readonly maxWasmMemoryPages: number
    readonly initialWasmMemoryPages: number
    readonly isNode: boolean
}

type UseDecode = {
    readonly options: UseDecodeOptions,
    readonly module: DecodeModule
}

function useDecoder(options: UseDecodeOptions) {
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

        const module = instance.exports as DecodeModule

        const PAGE_SIZE_BYTES = 65536

        const ensureMemory = (parent: UseDecode, requiredLength: number): boolean => {
            try {
                const module = parent.module
                const maxPagesCount = parent.options.maxWasmMemoryPages

                const currentLength = module.memory.buffer.byteLength

                if (requiredLength > currentLength) {
                    const pages = requiredLength / PAGE_SIZE_BYTES
                    const requiredPages = Math.ceil(requiredLength / PAGE_SIZE_BYTES)

                    if (requiredPages > maxPagesCount)
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
        const get_utf16_length = module.utf16_length
        const parse_ascii_prefix = module.parse_ascii_prefix

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
                    const ascii_length = index - 1

                    if (ascii_length <= 64) {
                        const factory = factories[ascii_length]
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

                const utf16_end = get_utf16_length()
                const utf16Length = utf16_end - multipleOfTwo

                if (utf16Length <= 128) {
                    const view = new Uint16Array(memory.buffer, multipleOfTwo, utf16Length / 2)
                    const factory = factories[view.length]
                    return {
                        value: factory(view, 0),
                        nextIndex: index + 1
                    }
                }

                if (options.isNode) {
                    const buffer = Buffer.from(memory.buffer, multipleOfTwo, utf16Length)
                    return {
                        value: buffer.toString('utf16le'),
                        nextIndex: index + 1
                    }
                }

                const view = new Uint8Array(memory.buffer, multipleOfTwo, utf16Length)
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
