import { add, complete, cycle, suite } from 'benny'

const date = "2026-06-30T14:51Z"
const utc = Date.UTC(2026, 6, 30, 14, 51)

suite(
    'decoding',

    add('mutation', () => {
        const date = new Date()
        date.setUTCFullYear(2026, 6, 30)
        date.setUTCHours(14, 51, 0, 0)
        return date
    }),
    add('utc-precompute', () => new Date(utc)),
    add('utc', () => new Date(Date.UTC(2026, 6, 30, 14, 51))),
    add('string', () => new Date(date)),

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
