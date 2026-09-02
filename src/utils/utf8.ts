import { genUnrolledFromCharCodeAscii } from "../code_gen/string"

export function getMaxBytesCount(charsCount: number): number {
    const maxBytesPerChar = 3
    return (charsCount * maxBytesPerChar) + maxBytesPerChar
}

const fromCharCodeUnrolledAscii = new Array<(data: ArrayLike<number>, i: number) => string>(32)
const decodeUnrolledAscii = (b: Uint8Array, start: number, length: number): string => {
    const factory = (fromCharCodeUnrolledAscii[length] ??= genUnrolledFromCharCodeAscii(length))
    return factory(b, start)
}

export function utf8DecoderForBuffer(bytes: Uint8Array): (start: number, end: number, ascii_only: boolean) => string {
    const buffer = Buffer.from(bytes.buffer)
    return (start, end, ascii_only = false) => {
        const length = end - start
        return ascii_only && length <= 32 ?
            decodeUnrolledAscii(bytes, start, length) :
            buffer.toString('utf8', start, end)
    }
}

export function utf8Decoder(bytes: Uint8Array): (start: number, end: number, ascii_only: boolean) => string {
    const unsafeDecoder8 = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true })
    return (start, end, ascii_only = false) => {
        const length = end - start
        return ascii_only && length <= 32 ?
            decodeUnrolledAscii(bytes, start, length) :
            unsafeDecoder8.decode(new Uint8Array(bytes.buffer, start, length))
    }
}