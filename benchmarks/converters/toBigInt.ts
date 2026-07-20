import { add, complete, cycle, suite } from 'benny'
import { tryParseBigInt } from '../../src/converters/bigint'
import { JsonReader } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const bytes = encoder.encode("'1123456789123456789123456789112345678912345678912345678911234567891234567891234567891123456789123456789123456789112345678912345678912345678911234567891234567891234567891123456789123456789123456789'")

const ctx: JsonReader = { bytes: bytes, options: defaultOptions }

const metaMock: any = {}

suite(
    'decoding',

    add('decode', () => ({
        value: BigInt(decoder.decode(bytes.subarray(1, bytes.length - 1))),
        nextIndex: bytes.length
    })),
    add('toBigInt', () => tryParseBigInt(ctx, metaMock, 1, 0)),

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
