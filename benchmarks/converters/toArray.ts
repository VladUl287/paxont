import { add, complete, cycle, suite } from 'benny'
import { ConvertCtx } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'
import { array, bool } from '../../src/metadata/builder'
import { toArray } from '../../src/converters/array'

const encoder = new TextEncoder()

const json = JSON.stringify(new Array(100).fill(true))
const bytes = encoder.encode(json)

const ctx: ConvertCtx = { bytes: bytes, options: defaultOptions }
const meta = array(bool())

suite(
    'decoding',

    add('toArray', () => toArray(ctx, meta, 0, 0)),
    add('JSON.parse', () => JSON.parse(json)),

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
