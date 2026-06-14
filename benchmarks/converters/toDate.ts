import { add, complete, cycle, suite } from 'benny'
import { toDate } from '../../src/converters/date'
import { ConvertCtx } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

const yearOnlyDate = "1970"
const yearOnlyBytes = encoder.encode(yearOnlyDate)

const yearOnlyCtx: ConvertCtx = {
    bytes: yearOnlyBytes,
    options: defaultOptions
}

const metaMock: any = {}

suite(
    'decoding',

    add('toDate', () => toDate(yearOnlyCtx, metaMock, 0, 0)),
    add('new Date', () => new Date(decoder.decode(yearOnlyBytes))),

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
