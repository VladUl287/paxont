import { generateSwitchMatcherPack } from "../code_gen/field"
import { toArray } from "../converters/array"
import { toBigInt } from "../converters/bigint"
import { toBoolean } from "../converters/boolean"
import { toDate } from "../converters/date"
import { toFloat32 } from "../converters/float"
import { toInt, toInt64, toUInt64 } from "../converters/int"
import { convertNumber } from "../converters/number"
import { toFloat64 } from "../converters/number_opt"
import { convertObject } from "../converters/object"
import { toSet } from "../converters/set"
import { toString } from "../converters/string"
import { Converter } from "../converters/types"
import { isTypedArray, TypedArray } from "../utils/typedArray"
import { TypeName } from "./types"

export type Metadata = {
    readonly convert: Converter<any>,
    readonly type: TypeName
    readonly name?: {
        value: string,
        bytes: Uint8Array<ArrayBuffer>
        equal: (bytes: Uint8Array, i: number) => boolean
    }
    readonly value?: Metadata | Metadata[]
    readonly defaultValue?: unknown
    readonly creator?: (props: any[]) => object
    readonly getFieldIndex?: (field: Uint8Array, index: number) => number
    readonly [key: string]: any
}

function getType(value: unknown): TypeName {
    if (value === null)
        throw new Error('invalid field type null')

    const typeMap = new Map<any, TypeName>([
        [Array, 'array'],
        [Date, 'date'],
        [Map, 'map'],
        [Set, 'set'],
        [Uint8Array, 'u8'],
        [Uint16Array, 'u16'],
        [Uint32Array, 'u32'],
        [BigUint64Array, 'u64'],
        [Int8Array, 'i8'],
        [Int16Array, 'i16'],
        [Int32Array, 'i32'],
        [BigInt64Array, 'i64'],
        [Float32Array, 'f32'],
        [Float64Array, 'f64'],
    ])

    for (const [constructor, typeName] of typeMap) {
        if (value instanceof constructor)
            return typeName
    }

    const type = typeof value

    if (type === 'undefined' || type === 'function')
        throw new Error(`invalid field type ${typeof value}`)

    return type
}

export function objectLiteralFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}

const converters: any = {
    number: convertNumber,
    string: toString,
    object: convertObject,
    date: toDate,
    boolean: toBoolean,
    bigint: toBigInt,
    array: toArray,
    set: toSet,
    'u8[]': toArray,
    'u16[]': toArray,
    'u32[]': toArray,
    'u64[]': toArray,
    'i8[]': toArray,
    'i16[]': toArray,
    'i32[]': toArray,
    'i64[]': toArray,
    'f32[]': toArray,
    'f64[]': toArray
}

const encoder = new TextEncoder()
export function toMetadata(object: unknown): Metadata {
    const value = toValue(object)
    const creator = objectLiteralFactory((value as Metadata[]).map(c => c.name!.value))

    return {
        convert: convertObject,
        defaultValue: object,
        type: getType(object),
        value: toValue(object),
        creator: creator,
        getFieldIndex: generateSwitchMatcherPack(
            Object.keys(object as any).map(c => encoder.encode(c)), {
            pack: true
        }) as any
    }

    function toValue(object: any): Metadata | Metadata[] | undefined {
        if (object === null || typeof object !== "object" || object instanceof Date)
            return

        if (Array.isArray(object))
            return {
                toValue: converters[getType(object[0])],
                convert: converters[getType(object[0])],
                type: getType(object[0]),
                value: toValue(object[0])
            }

        if (isTypedArray(object)) {
            function getTypedArrayType(arr: TypedArray): TypeName {
                if (arr instanceof Int8Array) return 'i8[]'
                if (arr instanceof Uint8Array) return 'u8[]'
                if (arr instanceof Int16Array) return 'i16[]'
                if (arr instanceof Uint16Array) return 'u16[]'
                if (arr instanceof Int32Array) return 'i32[]'
                if (arr instanceof Uint32Array) return 'u32[]'
                if (arr instanceof Float32Array) return 'f32[]'
                if (arr instanceof Float64Array) return 'f64[]'
                if (arr instanceof BigInt64Array) return 'i64[]'
                if (arr instanceof BigUint64Array) return 'u64[]'
                throw new Error('')
            }

            function getTypedArrayParser(arr: TypeName) {
                switch (arr) {
                    case 'i8[]':
                    case 'u8[]':
                    case 'i16[]':
                    case 'u16[]':
                    case 'i32[]':
                    case 'u32[]':
                        return toInt

                    case 'i64[]': return toInt64
                    case 'u64[]': return toUInt64

                    case 'f32[]': return toFloat32
                    case 'f64[]': return toFloat64

                    default: throw new Error(`error`);
                }
            }

            const type = getTypedArrayType(object[0] as any)
            return {
                toValue: getTypedArrayParser(type),
                type: type,
                convert: {} as any,
            }
        }

        if (object instanceof Set) {
            const value = object.values().next().value
            return {
                toValue: converters[getType(value)],
                convert: converters[getType(value)],
                type: getType(value),
                value: toValue(value)
            }
        }

        return Object.keys(object)
            .map((key): Metadata => {
                const keyValue = object[key]
                const type = getType(keyValue)
                const value = toValue(keyValue)
                return {
                    convert: converters[type],
                    name: {
                        value: key,
                        bytes: encoder.encode(key),
                        equal: createNameEquality(encoder.encode(key))
                    },
                    type: type,
                    value: value,
                    defaultValue: keyValue,
                    getFieldIndex: (type === 'object' ? (
                        generateSwitchMatcherPack(Object.keys(keyValue).map(c => encoder.encode(c)), { pack: true }) as any
                    ) : undefined),
                    creator: (type === 'object' ?
                        objectLiteralFactory((value as Metadata[]).map(c => c.name!.value)) :
                        undefined)
                }
            })
    }
}

export function createNameEquality(bytes: Uint8Array): any {
    const field = [...bytes]

    const chunks = []
    let j = 0
    for (; j < field.length - 4; j += 4) {
        const a = field[j]
        const b = field[j + 1]
        const c = field[j + 2]
        const d = field[j + 3]

        const packValue = a << 0 | b << 8 | c << 16 | d << 24

        chunks.push(`((bytes[i+${j}]<<0 | bytes[i+${j + 1}]<<8 | bytes[i+${j + 2}]<<16 | bytes[i+${j + 3}]<<24) === ${packValue})`)
    }

    chunks.push(
        '(' + field
            .slice(j)
            .map((v, jj) => `bytes[i+${j + jj}]===${v}`)
            .join(' && ') + ')'
    )

    return new Function('bytes', 'i', 'return (' + chunks.join(' && ') + ')')
}