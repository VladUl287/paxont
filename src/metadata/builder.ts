import { toArray } from "../converters/array"
import { toBigInt } from "../converters/bigint"
import { toString } from "../converters/string"
import { TypedArray } from "../utils/typedArray"
import { BaseMeta, CollectionMeta, MapMeta, NullableMeta, ObjectFieldMeta, ObjectMeta, PrimitiveMeta, toValueConverter } from "./types"
import { BaseType, JSONT } from "./baseTypes"
import { toBoolean } from "../converters/boolean"
import { toDate } from "../converters/date"
import { toFloat32, toFloat64, toInt16, toInt32, toInt64, toInt8, toUint16, toUint32, toUInt64, toUInt8 } from "../converters/number"
import { toMap } from "../converters/map"
import { toSet } from "../converters/set"
import { genObjectFactory, genObjectToJsonFactory1 } from "../code_gen/object"
import { generateTrieSwitch } from "../code_gen/field"
import { toObject } from "../converters/object"
import { toNullable } from "../converters/nullable"

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type ExtractType<M> = M extends BaseMeta<infer U, any> ? U : never

type ObjectFromMeta<T extends ObjectFieldMeta<any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U, any> ? U : never
}>

export const string = () => primitive(JSONT.STRING, toString)
export const number = () => primitive(JSONT.NUMBER, toFloat64)
export const bigInt = () => primitive(JSONT.BIGINT, toBigInt)
export const bool = () => primitive(JSONT.BOOL, toBoolean)
export const date = () => primitive(JSONT.DATE, toDate)

export const u8 = () => primitive(JSONT.U8, toUInt8)
export const u16 = () => primitive(JSONT.U16, toUint16)
export const u32 = () => primitive(JSONT.U32, toUint32)
export const i8 = () => primitive(JSONT.I8, toInt8)
export const i16 = () => primitive(JSONT.I16, toInt16)
export const i32 = () => primitive(JSONT.I32, toInt32)

export const u64 = () => primitive(JSONT.U64, toUInt64)
export const i64 = () => primitive(JSONT.I64, toInt64)

export const f32 = () => primitive(JSONT.F32, toFloat32)

const primitive = <T extends Object>(type: BaseType, toValue: toValueConverter<T, PrimitiveMeta<T>>): PrimitiveMeta<T> => ({
    type: type,
    toValue: toValue,
    toJson: (s, _) => s.toString()
})

export const nullable = <M extends BaseMeta<ExtractType<M>, M>>(value: M): NullableMeta<ExtractType<M>, M> => ({
    type: JSONT.NULLABLE,
    toJson: (value, meta, options) => {
        if (value === null) return 'null'
        return meta.value.toJson(value, meta.value, options)
    },
    toValue: toNullable,
    value: value,
})

export const array = <M extends BaseMeta<ExtractType<M>, M>>(
    value: M
): CollectionMeta<ExtractType<M>[], ExtractType<M>, M> => ({
    type: JSONT.ARRAY,
    toValue: toArray,
    toJson: (value, meta, options) => {
        const metaValue = meta.value
        const toJson = metaValue.toJson
        return `[${value.map(c => toJson(c, metaValue, options)).join(',')}]`
    },
    value: value
})

export const u8Array = () => typedArray<Uint8Array>(JSONT.U8_ARRAY, u8())
export const u16Array = () => typedArray<Uint16Array>(JSONT.U16_ARRAY, u16())
export const u32Array = () => typedArray<Uint32Array>(JSONT.U32_ARRAY, u32())
export const u64Array = () => typedArray1<BigUint64Array>(JSONT.U32_ARRAY, u64())

export const i8Array = () => typedArray<Int8Array>(JSONT.I8_ARRAY, i8())
export const i16Array = () => typedArray<Int16Array>(JSONT.I16_ARRAY, i16())
export const i32Array = () => typedArray<Int32Array>(JSONT.I32_ARRAY, i32())
export const i64Array = () => typedArray1<BigInt64Array>(JSONT.I64_ARRAY, i64())

export const f32Array = () => typedArray<Float32Array>(JSONT.F32_ARRAY, f32())
export const f64Array = () => typedArray<Float64Array>(JSONT.F64_ARRAY, number())

const typedArray = <T extends TypedArray>(
    type: BaseType, value: PrimitiveMeta<number>
): CollectionMeta<T, number, PrimitiveMeta<number>> => ({
    type: type,
    toValue: toArray,
    toJson: (value) => `[${value.join(',')}]`,
    value: value
})

const typedArray1 = <T extends TypedArray>(
    type: BaseType, value: PrimitiveMeta<bigint>
): CollectionMeta<T, bigint, PrimitiveMeta<bigint>> => ({
    type: type,
    toValue: toArray,
    toJson: (value) => `[${value.join(',')}]`,
    value: value
})

export const map = <M extends BaseMeta<ExtractType<M>, M>>(value: M): MapMeta<ExtractType<M>, M> => ({
    type: JSONT.MAP,
    key: string(),
    value: value,
    toValue: toMap,
    toJson: (v, m, o) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.entries()].map(c => `"${c[0]}": ${toJson(c[1], meta, o)}`).join(',')}}`
    }
})

export const set = <M extends BaseMeta<ExtractType<M>, M>>(value: M): CollectionMeta<Set<ExtractType<M>>, ExtractType<M>, M> => ({
    type: JSONT.SET,
    value: value,
    toValue: toSet,
    toJson: (v, m, o) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.values()].map(v => toJson(v, meta, o)).join(',')}}`
    }
})

export const field = <K extends string, M extends BaseMeta<any, any>>(
    name: K, value: M, encoder: TextEncoder = new TextEncoder()
): ObjectFieldMeta<K, ExtractType<M>> => {
    return {
        name: {
            value: name,
            bytes: encoder.encode(name)
        },
        ...value,
    }
}

export const object = <M extends ObjectFieldMeta<any, any>[]>(...fields: M): ObjectMeta<ObjectFromMeta<M>> => {
    const keys = fields.map(f => f.name.value as string)
    const factory = genObjectFactory(keys) as any

    const keysBytes = fields.map(f => f.name.bytes)
    const fieldIndex = generateTrieSwitch(keysBytes, {
        pack: true
    }) as any

    const toJson = genObjectToJsonFactory1(...fields)

    const result: ObjectMeta<ObjectFromMeta<M>> = {
        type: JSONT.OBJECT,
        fields: fields,
        build: factory,
        getFieldIndex: fieldIndex,
        toValue: toObject as any,
        toJson: toJson
    }

    return result
}
