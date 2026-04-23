import { add, complete, cycle, suite } from 'benny'
import { equals } from '../src/utils/array'
import { createNameEquality } from '../src/metadata/metadata'

const encoder = new TextEncoder()

const mid = encoder.encode("9007199254740992")
const midCopy = new Uint8Array([...mid])
const big = encoder.encode("11234567891234567891234567891234567899007199254740992")
const bigCopy = new Uint8Array([...big])

const codegenEqualityMid = createNameEquality(mid)
const codegenEqualityBig = createNameEquality(big)
const codegenEqualityTwoArrays = createNameEqualityTwoLoops(mid)
const codegenEqualityTwoArraysBig = createNameEqualityTwoLoops(big)

suite(
    'field_equal',

    add('loop', () => equals(mid, midCopy, 0, 0)),
    add('codegen', () => codegenEqualityMid(mid, 0)),
    add('codegen_two_arrays', () => codegenEqualityTwoArrays(mid, midCopy, 0, 0)),

    add('loop_big', () => equals(big, bigCopy, 0, 0)),
    add('codegen_big', () => codegenEqualityBig(big, 0)),
    add('codegen_two_arrays_big', () => codegenEqualityTwoArraysBig(big, bigCopy, 0, 0)),

    cycle(),
    complete(),
)

export function createNameEqualityTwoLoops(bytes: Uint8Array): any {
    const conditions = [...bytes]
        .map((_, i) => `bytes[i+${i}]===bytes2[i2+${i}]`)
        .join(' && ')

    return new Function('bytes', 'bytes2', 'i', 'i2', 'return ' + conditions)
}
