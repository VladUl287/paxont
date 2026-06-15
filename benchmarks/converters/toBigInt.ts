import { add, complete, cycle, suite } from 'benny'
import { toBigInt } from '../../src/converters/bigint'
import { ConvertCtx } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const bigintBytes = encoder.encode("'1123456789123456789123456789112345678912345678912345678911234567891234567891234567891123456789123456789123456789112345678912345678912345678911234567891234567891234567891123456789123456789123456789'")

const ctx: ConvertCtx = { bytes: bigintBytes, options: defaultOptions }

const metaMock: any = {}

suite(
    'decoding',

    add('decode', () => ({
        value: BigInt(decoder.decode(bigintBytes.subarray(1, bigintBytes.length - 1))),
        nextIndex: bigintBytes.length
    })),
    add('toBigInt', () => toBigInt(ctx, metaMock, 1, 0)),

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
