import { add, complete, cycle, suite } from 'benny'
import { ParseContext, PrimitiveMeta } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from '../../src/converters/number/int'
import { Stack } from '../../src/utils/structs'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const u8_str = "123"
const u16_str = "12345"
const u32_str = "123456789"
const u8 = encoder.encode(u8_str)
const u16 = encoder.encode(u16_str)
const u32 = encoder.encode(u32_str)

const u8Context: ParseContext = { reader: { bytes: u8, writable: false }, options: defaultOptions, stack: new Stack() }
const u16Context: ParseContext = { reader: { bytes: u16, writable: false }, options: defaultOptions, stack: new Stack() }
const u32Context: ParseContext = { reader: { bytes: u32, writable: false }, options: defaultOptions, stack: new Stack() }
const metadata: PrimitiveMeta<number> = {} as any

suite(
    'decoding',

    add('toUint8', () => toUint8(metadata, u8Context, 0, 0)),
    add('toUint16', () => toUint16(metadata, u16Context, 0, 0)),
    add('toUint32', () => toUint32(metadata, u32Context, 0, 0)),
    add('toInt8', () => toInt8(metadata, u8Context, 0, 0)),
    add('toInt16', () => toInt16(metadata, u16Context, 0, 0)),
    add('toInt32', () => toInt32(metadata, u32Context, 0, 0)),
    add('toUint8_parse', () => JSON.parse(u8_str)),
    add('toUint16_parse', () => JSON.parse(u16_str)),
    add('toUint32_parse', () => JSON.parse(u32_str)),

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
