import type { utf16LeDecoder } from "../../utils/utf16"
import type { utf8Decoder } from "../../utils/utf8"
import type { wasmInstance } from "../../utils/wasm"

export type utilsModule = {
    readonly trim_to_last_char: (start: number, end: number) => number
    readonly find_quote: (i: number, start: number, end: number) => number
}

export type utf8Module = {
    readonly memory: WebAssembly.Memory
    readonly ascii_only: () => number
    readonly dq_index: () => number
    readonly target: () => number
    readonly utf8_to_utf8: (start: number, length: number, target: number) => number
}

export type utf16Module = {
    readonly memory: WebAssembly.Memory
    readonly dq_index: () => number
    readonly target: () => number
    readonly utf8_to_utf16: (start: number, length: number, target: number) => number
}

export type asciiModule = {
    readonly parse_ascii: (i: number, start: number, end: number, target: number, extend: number) => unknown
}

export type asciiUtilsModule = {
    readonly store_32: (byte: number, target: number) => number
    readonly store_128_unsafe: (data: any, byte_count: number, target: number) => number
    readonly store_code_point: (offset: number, code_point: number) => number
}

export type utf8ScanModule = {
    readonly code_units_count: () => number
    readonly has_escaped: () => number

    readonly utf8_scan_i32: (a1: number, a2: number, a3: number, a4: number) => number
    readonly utf8_scan: (i: number, len: number, exact: number) => number

    readonly utf8_scan_ascii: (i: number, len: number) => number
}

export type StringParseOptions = {
    readonly wasmInstance: typeof wasmInstance
    readonly maxMemoryPages: number
    readonly defaultMemoryPages: number
    readonly useUtf16: boolean
    readonly utf16LeDecoder: typeof utf16LeDecoder
    readonly utf8Decoder: typeof utf8Decoder
    readonly onError: (error: unknown) => void
}