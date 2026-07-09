import { add, complete, cycle, suite } from 'benny'

const textDecoder = new TextDecoder('utf-8')
const textEncoder = new TextEncoder()

const bytes = textEncoder.encode('datedatedatedatedatedatedate')
const bytesArr = [...bytes]

suite(
    'decoding',

    add('fromCharCode', () => String.fromCharCode.apply(null, bytesArr)),
    add('default', () => textDecoder.decode(bytes)),

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
