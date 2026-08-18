import { genUnrolledFromCharCode16LE } from "../code_gen/string"

const fromCharCodeUnrolled16LE = new Array<(data: ArrayLike<number>, i: number) => string>(32)
const decodeUnrolled16LE = (b: Uint8Array, start: number, length: number): string => {
    const factory = (fromCharCodeUnrolled16LE[length / 2] ??= genUnrolledFromCharCode16LE(length))
    return factory(b, start)
}

export function newUtf16LEBuffer(bytes: Uint8Array): (start: number, end: number) => string {
    const buffer = Buffer.from(bytes.buffer)
    return (start, end) => {
        const length = end - start
        return length <= 64 ?
            decodeUnrolled16LE(buffer, start, length) :
            buffer.toString('utf-16le', start, end)
    }
}

export function newUtf16LE(bytes: Uint8Array, fatal = false): (start: number, end: number) => string {
    const unsafeDecoder16 = new TextDecoder('utf-16le', { fatal })
    return (start, end) => {
        const length = end - start
        return length <= 64 ?
            decodeUnrolled16LE(bytes, start, length) :
            unsafeDecoder16.decode(new Uint8Array(bytes.buffer, start, end - start))
    }
}