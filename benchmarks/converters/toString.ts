import { add, complete, cycle, suite } from 'benny'
import { BaseMeta, JsonReader, PrimitiveMeta } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'
import { toParseString } from '../../src/converters/string'
import { DOUBLE_QUOTE } from '../../src/utils/utf8constants'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const str = '"' + new Array(1024).fill('а').join('') + '"'
const bytes = encoder.encode(str)

const ctx: JsonReader = {
    raw: str,
    bytes: bytes, options: defaultOptions 
}

const metaMock: any = {}

suite(
    'decoding',

    add('toString', () => toParseString(ctx, metaMock, 0, 0)),
    // add('decode', () => direct(ctx, metaMock, 0, 0)),

    cycle((result) => {
        const nanoseconds = (1 / result.ops) * 1e9
        console.log(
            `${result.name}: ` +
            `${result.ops.toLocaleString()} ops/s, ` +
            `${nanoseconds.toFixed(2)} ns/op`
        )
    }),

    complete(),
)

function direct(ctx: JsonReader, _meta: PrimitiveMeta<string>, i: number, _depth: number) {
    const b = ctx.bytes

    if (b[i] !== DOUBLE_QUOTE) throw new Error("")
    i++

    const section = b.subarray(i, b.length - 2)
    return {
        value: ctx.options.decoder.decode(section),
        nextIndex: ++i
    }
}
