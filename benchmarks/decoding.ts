import { add, complete, cycle, suite } from 'benny'
import { utf8toString } from '@exodus/bytes/utf8.js'

const bytes = new TextEncoder().encode('datedatedatedatedatedatedate')
const bytesArr = [...bytes]
const buffer = Buffer.from(bytes)
const textDecoder = new TextDecoder()

suite(
    'decoding',

    add('default', () => textDecoder.decode(bytes)),
    add('fromCharCode', () => String.fromCharCode.apply(String, bytesArr)),
    add('buffer', () => buffer.toString()),
    add('exodus-utf8', () => utf8toString(bytes)),

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
