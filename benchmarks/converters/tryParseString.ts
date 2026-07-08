import { add, complete, cycle, suite } from 'benny'
import { JsonReader } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'
import { tryParseString } from '../../src/converters/string'

const encoder = new TextEncoder()

const str = '"' + new Array(150).fill('a').join('') + '"'
const bytes = encoder.encode(str)
const data: JsonReader = {
    bytes: bytes,
    writable: false,
    options: defaultOptions
}

suite(
    'decoding',

    add('toString', () => tryParseString(data, {} as any, 0, 0, {})),
    add('decode', () => JSON.parse(str)),

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
