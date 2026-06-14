import { add, complete, cycle, suite } from 'benny'

const date = "1970-02-01"
const dateBytes = new TextEncoder().encode(date)

suite(
    'decoding',

    add('ctor-methods', () => {
        const date = new Date()
        date.setUTCFullYear(2000, 0, 1)
        date.setUTCHours(0, 0, 0, 0)
        return date
    }),
    add('utc', () => new Date(Date.UTC(2000))),
    add('string', () => new Date("2000")),

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
