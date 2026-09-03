import { add, complete, cycle, suite } from 'benny'
import { toUint64 } from '../../src/converters/toValue/number/bigint'
import { JsonReader } from '../../src/utils/reader'
import { JsonParsingContext } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'
import { deserialize } from '../../src'
import { bigInt, i64, u64 } from '../../src/metadata/builder'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const int64Min = encoder.encode("-9223372036854775808")
const int64Max = encoder.encode("9223372036854775807")
const uint64Min = encoder.encode("0")
const uint64Max = encoder.encode("18446744073709551615")
const bigint = encoder.encode("18446744073709551615")

const int64Meta = i64()
const uInt64Meta = u64()
const bigIntMeta = bigInt()

suite(
    'bigint',

    add('int64Min', () => deserialize(int64Min, int64Meta)),
    add('int64Max', () => deserialize(int64Max, int64Meta)),
    add('uInt64Min', () => deserialize(uint64Min, uInt64Meta)),
    add('uInt64Max', () => deserialize(uint64Max, uInt64Meta)),
    add('bigint', () => deserialize(bigint, bigIntMeta)),

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
