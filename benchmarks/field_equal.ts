import { add, complete, cycle, suite } from 'benny'
import { equals } from '../src/utils/array'

const encoder = new TextEncoder()

const mid = encoder.encode("9007199254740992")
const midCopy = new Uint8Array([...mid])
const big = encoder.encode("11234567891234567891234567891234567899007199254740992")
const bigCopy = new Uint8Array([...big])

const codegenEqualityMid = createNameEquality(mid)
const codegenEqualityTwoArrays = createNameEqualityTwoLoops(mid)
const codegenPackEqMid = genEqualityPack(mid)
const codegenEqualityBig = createNameEquality(big)
const codegenEqualityTwoArraysBig = createNameEqualityTwoLoops(big)
const codegenPackEq = genEqualityPack(big)
const codegenIntepret = genUnsafeInterpet(big)
const codegenIntepretMid = genUnsafeInterpet(mid)

suite(
    'field_equal',

    add('loop', () => equals(mid, midCopy, 0, 0)),
    add('codegen', () => codegenEqualityMid(mid, 0)),
    add('codegen_two_arrays', () => codegenEqualityTwoArrays(mid, midCopy, 0, 0)),
    add('codegen_pack', () => codegenPackEqMid(mid, 0)),
    add('codegen_interpret', () => codegenIntepretMid(mid, 0)),

    add('loop_big', () => equals(big, bigCopy, 0, 0)),
    add('codegen_big', () => codegenEqualityBig(big, 0)),
    add('codegen_two_arrays_big', () => codegenEqualityTwoArraysBig(big, bigCopy, 0, 0)),
    add('codegen_pack_big', () => codegenPackEq(big, 0)),
    add('codegen_interpret_big', () => codegenIntepret(big, 0)),

    cycle(),
    complete(),
)

export function createNameEqualityTwoLoops(bytes: Uint8Array): any {
    const conditions = [...bytes]
        .map((_, i) => `bytes[i+${i}]===bytes2[i2+${i}]`)
        .join(' && ')

    return new Function('bytes', 'bytes2', 'i', 'i2', 'return ' + conditions)
}

export function genEqualityPack(bytes: Uint8Array) {
    let chunks = []

    let i = 0
    for (; i < bytes.length - 4; i += 4) {
        const a = bytes[i]
        const b = bytes[i + 1]
        const c = bytes[i + 2]
        const d = bytes[i + 3]

        const packValue = a << 0 | b << 8 | c << 16 | d << 24

        chunks.push(`((bytes[i+${i}]<<0 | bytes[i+${i + 1}]<<8 | bytes[i+${i + 2}]<<16 | bytes[i+${i + 3}]<<24) === ${packValue})`)
    }

    chunks.push(
        '(' + [...bytes]
            .slice(i)
            .map((v, j) => `bytes[i+${i + j}]===${v}`)
            .join(' && ') + ')'
    )

    return new Function('bytes', 'i', 'return ' + chunks.join(' && '))
}

export function genUnsafeInterpet(bytes: Uint8Array) {
    let body = `
        const alignedLength = (bytes.length & ~3) / 4
        const conversionU32 = new Uint32Array(bytes.buffer, i, alignedLength)
    `

    const alignedLength = (bytes.length & ~3) / 4
    const conversionU32 = [...new Uint32Array(bytes.buffer, 0, alignedLength)]
    const condition = conversionU32
        .map((v, i) => `conversionU32[${i}] === ${v}`)
        .join(' && ')

    body += condition

    return new Function('bytes', 'i', body)
}

export function createNameEquality(bytes: Uint8Array): any {
    const conditions = [...bytes]
        .map((v, i) => `bytes[i+${i}]===${v}`)
        .join(' && ')

    return new Function('bytes', 'i', 'return ' + conditions)
}