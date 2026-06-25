import { toArray } from "../converters/array"
import { toBigInt } from "../converters/bigint"
import { toString } from "../converters/string"
import { TypedArray } from "../utils/typedArray"
import { BaseMeta, CollectionMeta, MapMeta, ObjectFieldMeta, ObjectMeta, PrimitiveMeta, toValueConverter } from "./types"
import * as Base from "./baseTypes"
import { toBoolean } from "../converters/boolean"
import { toDate } from "../converters/date"
import { toFloat32, toFloat64, toInt16, toInt32, toInt64, toInt8, toUint16, toUint32, toUInt64, toUInt8 } from "../converters/number"
import { toMap } from "../converters/map"
import { toSet } from "../converters/set"
import { genObjectFactory, genObjectToJsonFactory1 } from "../code_gen/object"
import { generateTrieSwitch } from "../code_gen/field"
import { toObject } from "../converters/object"

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type ExtractType<M> = M extends BaseMeta<infer U, any> ? U : never

type ObjectFromMeta<T extends ObjectFieldMeta<any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U, any> ? U : never
}>

const string = () => primitive(Base.JSONT_STRING, toString)
const number = () => primitive(Base.JSONT_NUMBER, toFloat64)
const bigInt = () => primitive(Base.JSONT_BIGINT, toBigInt)
const bool = () => primitive(Base.JSONT_BOOL, toBoolean)
const date = () => primitive(Base.JSONT_DATE, toDate)

const u8 = () => primitive(Base.JSONT_U8, toUInt8)
const u16 = () => primitive(Base.JSONT_U16, toUint16)
const u32 = () => primitive(Base.JSONT_U32, toUint32)
const i8 = () => primitive(Base.JSONT_I8, toInt8)
const i16 = () => primitive(Base.JSONT_I16, toInt16)
const i32 = () => primitive(Base.JSONT_I32, toInt32)

const u64 = () => primitive(Base.JSONT_U64, toUInt64)
const i64 = () => primitive(Base.JSONT_I64, toInt64)

const f32 = () => primitive(Base.JSONT_F32, toFloat32)

const primitive = <T extends Object>(type: Base.BaseTypes, toValue: toValueConverter<T, PrimitiveMeta<T>>): PrimitiveMeta<T> => ({
    type: type,
    toValue: toValue,
    toJson: (s, _) => s.toString()
})

const array = <T extends BaseMeta<any, any>>(value: T): CollectionMeta<Array<ExtractType<T>>, ExtractType<T>> => ({
    type: Base.JSONT_ARRAY,
    toValue: toArray,
    toJson: (s, m) => {
        const meta = m.value
        const toJson = meta.toJson
        return `[${s.map(c => toJson(c, meta)).join(',')}]`
    },
    value: value
})

const u8Array = () => typedArray<Uint8Array>(Base.JSONT_U8_ARRAY, u8())
const u16Array = () => typedArray<Uint16Array>(Base.JSONT_U16_ARRAY, u16())
const u32Array = () => typedArray<Uint32Array>(Base.JSONT_U32_ARRAY, u32())
const u64Array = () => bigintArray<BigUint64Array>(Base.JSONT_U32_ARRAY, u64())

const i8Array = () => typedArray<Int8Array>(Base.JSONT_I8_ARRAY, i8())
const i16Array = () => typedArray<Int16Array>(Base.JSONT_I16_ARRAY, i16())
const i32Array = () => typedArray<Int32Array>(Base.JSONT_I32_ARRAY, i32())
const i64Array = () => bigintArray<BigInt64Array>(Base.JSONT_I64_ARRAY, i64())

const f32Array = () => typedArray<Float32Array>(Base.JSONT_F32_ARRAY, f32())
const f64Array = () => typedArray<Float64Array>(Base.JSONT_F64_ARRAY, number())

const typedArray = <T extends TypedArray>(type: Base.BaseTypes, value: PrimitiveMeta<number>): CollectionMeta<T, number> => ({
    type: type,
    toValue: toArray,
    toJson: (s, _) => `[${s.join(',')}]`,
    value: value
})

const bigintArray = <T extends TypedArray>(type: Base.BaseTypes, value: PrimitiveMeta<bigint>): CollectionMeta<T, bigint> => ({
    type: type,
    toValue: toArray,
    toJson: (s, _) => `[${s.join(',')}]`,
    value: value
})

const map = <T extends BaseMeta<any, any>>(value: T): MapMeta<ExtractType<T>> => ({
    type: Base.JSONT_MAP,
    key: string(),
    value: value,
    toValue: toMap,
    toJson: (v, m) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.entries()].map(c => `"${c[0]}": ${toJson(c[1], meta)}`).join(',')}}`
    }
})

const set = <T extends BaseMeta<any, any>>(value: T): CollectionMeta<Set<ExtractType<T>>, ExtractType<T>> => ({
    type: Base.JSONT_SET,
    value: value,
    toValue: toSet,
    toJson: (v, m) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.values()].map(v => toJson(v, meta)).join(',')}}`
    }
})

const encoder = new TextEncoder()
export const field = <K extends string, M extends BaseMeta<any, any>>(
    name: K, value: M
): ObjectFieldMeta<K, ExtractType<M>> => ({
    name: {
        value: name,
        bytes: encoder.encode(name)
    },
    type: value.type,
    toJson: value.toJson,
    toValue: value.toValue
})

export const object = <M extends ObjectFieldMeta<any, any>[]>(...fields: M): ObjectMeta<ObjectFromMeta<M>> => {
    const keys = fields.map(f => f.name.value as string)
    const factory = genObjectFactory(keys) as any

    const keysBytes = fields.map(f => f.name.bytes)
    const fieldIndex = generateTrieSwitch(keysBytes, {
        pack: true
    }) as any

    const result = {
        type: 'object',
        fields: fields,
        factory: factory,
        fieldIndexResolver: fieldIndex,
        toValue: toObject as any,
        toJson: genObjectToJsonFactory1(...fields) as any
    }

    return result
}

const obj = object(
    field("id", number()),
    field("name", string()),
    field("createdAt", date()),
    field("deleted", bool()),
    field("mantissa", bigInt()),
    field("timestamps", u32Array()),
    field('enter_timestamps', map(date())),
    field('tags', set(string())),
    field("coordinates", array(
        object(
            field("x", u8()),
            field("y", u8())
        )
    )),
    field("role", object(
        field("id", number()),
        field("value", string())
    ))
)