import { add, complete, cycle, suite } from 'benny'
import { isISO8601, isISO8601FromString } from '../src/utils/date'

const date = "1970-02-01"
const dateBytes = new TextEncoder().encode(date)

suite(
    'decoding',

    add('fromString', () => isISO8601FromString(date)),
    add('fromBytes', () => isISO8601(dateBytes, 0)),

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
