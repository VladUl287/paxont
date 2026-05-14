import { bitLength, parseNumberF64 } from '../src/converters/number'
import { add, complete, cycle, suite } from 'benny'

const small = 1234567n
const mid = 1234567891234567891n
const big = 123456789123456789123456789123456789123456789123456789n

suite(
    'bit_legnth',

    add('small_toString(2)', () => small.toString(2).length),
    add('small_bitLength', () => bitLength(small)),
    add('mid_toString(2)', () => mid.toString(2).length),
    add('mid_bitLength', () => bitLength(mid)),
    add('big_toString(2)', () => big.toString(2).length),
    add('big_bitLength', () => bitLength(big)),

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