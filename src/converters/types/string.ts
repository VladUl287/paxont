import type { utf16LeDecoder } from "../../utils/utf16"
import type { utf8Decoder } from "../../utils/utf8"
import type { wasmInstance } from "../../utils/wasm"

export type utf8Module = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly dq_index: () => number
    readonly utf8_to_utf8: (start: number, length: number, partial: number) => number
}

export type utf16Module = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly dq_index: () => number
    readonly utf16_length: () => number
    readonly utf8_to_utf16: (start: number, length: number, target: number, partial: number) => number
}

export type utf8ScanModule = {
    readonly memory: WebAssembly.Memory
    readonly chars_count: () => number
    readonly utf8_scan: (start: number, end: number) => number
    readonly utf8_scan_exact: (start: number, end: number) => number
}

export type StringParseOptions = {
    readonly wasmInstance: typeof wasmInstance
    readonly maxMemoryPages: number
    readonly defaultMemoryPages: number
    readonly useUtf16: boolean,
    readonly utf16LeDecoder: typeof utf16LeDecoder,
    readonly utf8Decoder: typeof utf8Decoder
}