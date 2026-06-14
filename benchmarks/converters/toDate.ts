import { add, complete, cycle, suite } from 'benny'
import { toDate } from '../../src/converters/date'
import { ConvertCtx } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

const yearOnly = "\"1970\""
const yearOnlyBytes = encoder.encode(yearOnly)

const dateOnly = "\"1970-06-25\""
const dateOnlyBytes = encoder.encode(dateOnly)

const dateTimeUtcOnly = "\"1970-06-25T12:32:12.123Z\""
const dateTimeUtcBytes = encoder.encode(dateTimeUtcOnly)

const yearOnlyCtx: ConvertCtx = { bytes: yearOnlyBytes, options: defaultOptions }
const dateOnlyCtx: ConvertCtx = { bytes: dateOnlyBytes, options: defaultOptions }
const dateTimeUtcCtx: ConvertCtx = { bytes: dateTimeUtcBytes, options: defaultOptions }

const metaMock: any = {}

suite(
    'decoding',

    add('toDate YYYY', () => toDate(yearOnlyCtx, metaMock, 0, 0)),
    add('new Date YYYY', () => new Date(decoder.decode(yearOnlyBytes.subarray(1, yearOnlyBytes.length - 1)))),

    add('toDate YYYY-MM-DD', () => toDate(dateOnlyCtx, metaMock, 0, 0)),
    add('new Date YYYY-MM-DD', () => new Date(decoder.decode(dateOnlyBytes.subarray(1, dateOnlyBytes.length - 1)))),

    add('toDate YYYY-MM-DDTHH:mm:ss.sssZ', () => toDate(dateTimeUtcCtx, metaMock, 0, 0)),
    add('new Date YYYY-MM-DDTHH:mm:ss.sssZ', () => new Date(decoder.decode(dateTimeUtcBytes.subarray(1, dateTimeUtcBytes.length - 1)))),

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
