import { toArray } from "../converters/array"
import { TypedArray } from "../utils/typedArray"
import {
    ArrayMeta,
    BaseMeta, Expand, ExtractType, MapMeta, NullableMeta, ObjectFieldMeta,
    ObjectMeta, PrimitiveMeta, SetMeta, tryParseValue
} from "./types"
import { BaseType, JSONT } from "./baseTypes"
import { tryParseDate } from "../converters/date"
import { tryParseMap } from "../converters/map"
import { tryParseSet } from "../converters/set"
import { genObjectFactory, genObjectToJsonFactory1 } from "../code_gen/object"
import { generateTrieSwitch } from "../code_gen/field"
import { tryParseObject } from "../converters/object"
import { tryParseNullable } from "../converters/nullable"
import { tryParseBigInt, tryParseInt64, tryParseUint64 } from "../converters/number/bigint"
import { tryParseBoolean } from "../converters/boolean"
import { tryParseString } from "../converters/string"
import { ArrayPool, useArrayPool } from "../utils/array"
import { tryParseInt16, tryParseInt32, tryParseInt8, tryParseUint16, tryParseUint32, tryParseUint8 } from "../converters/number/int"
import { tryParseFloat64 } from "../converters/number/float"

export const string = () => primitive(JSONT.STRING, tryParseString)
export const number = () => primitive(JSONT.NUMBER, tryParseFloat64)
export const bigInt = () => primitive(JSONT.BIGINT, tryParseBigInt)
export const bool = () => primitive(JSONT.BOOL, tryParseBoolean)
export const date = () => primitive(JSONT.DATE, tryParseDate)

export const u8 = () => primitive(JSONT.U8, tryParseUint8)
export const u16 = () => primitive(JSONT.U16, tryParseUint16)
export const u32 = () => primitive(JSONT.U32, tryParseUint32)
export const i8 = () => primitive(JSONT.I8, tryParseInt8)
export const i16 = () => primitive(JSONT.I16, tryParseInt16)
export const i32 = () => primitive(JSONT.I32, tryParseInt32)

export const u64 = () => primitive(JSONT.U64, tryParseUint64)
export const i64 = () => primitive(JSONT.I64, tryParseInt64)

const primitive = <T extends Object>(type: BaseType, toValue: tryParseValue<T, PrimitiveMeta<T>>): PrimitiveMeta<T> => ({
    type: type,
    tryParseValue: toValue,
    toJson: (s, _) => s.toString()
})

export const nullable = <M extends BaseMeta<ExtractType<M>, M>>(value: M): NullableMeta<ExtractType<M>, M> => ({
    type: JSONT.NULLABLE,
    toJson: (meta, value, options) => {
        if (value === null) return 'null'
        return meta.value.toJson(meta.value, value, options)
    },
    tryParseValue: tryParseNullable,
    value: value,
})

type Modifier = <M extends BaseMeta<ExtractType<M>, M>>(metadata: M) => M

export const arrayPool =
    <T, A extends ArrayLike<T>>(pool: ArrayPool<T, A>) =>
        <M extends ArrayMeta<ExtractType<M>, ExtractType<M>[], any>>(metadata: M): M => ({
            ...metadata,
            arrayPool: pool
        })

export const array = <M extends BaseMeta<ExtractType<M>, M>>(
    value: M,
    ...modifiers: Array<Modifier>
): ArrayMeta<ExtractType<M>, ExtractType<M>[], M> => {
    let meta: ArrayMeta<ExtractType<M>, ExtractType<M>[], M> = {
        type: JSONT.ARRAY,
        tryParseValue: toArray,
        toJson: (meta, value, options) => {
            const metaValue = meta.value
            const toJson = metaValue.toJson
            return `[${value.map(c => toJson(metaValue, c, options)).join(',')}]`
        },
        value: value,
        arrayPool: useArrayPool()
    }

    modifiers.forEach(modify => {
        meta = modify(meta)
    })

    return meta
}

export const u8Array = () => typedArray<Uint8Array>(JSONT.U8_ARRAY, u8())
export const u16Array = () => typedArray<Uint16Array>(JSONT.U16_ARRAY, u16())
export const u32Array = () => typedArray<Uint32Array>(JSONT.U32_ARRAY, u32())
export const u64Array = () => typedArray1<BigUint64Array>(JSONT.U32_ARRAY, u64())

export const i8Array = () => typedArray<Int8Array>(JSONT.I8_ARRAY, i8())
export const i16Array = () => typedArray<Int16Array>(JSONT.I16_ARRAY, i16())
export const i32Array = () => typedArray<Int32Array>(JSONT.I32_ARRAY, i32())
export const i64Array = () => typedArray1<BigInt64Array>(JSONT.I64_ARRAY, i64())

export const f64Array = () => typedArray<Float64Array>(JSONT.F64_ARRAY, number())

const typedArray = <T extends TypedArray>(
    type: BaseType, value: PrimitiveMeta<number>
): ArrayMeta<number, T, PrimitiveMeta<number>> => ({
    type: type,
    tryParseValue: toArray,
    toJson: (m, value) => `[${value.join(',')}]`,
    value: value
})

const typedArray1 = <T extends TypedArray>(
    type: BaseType, value: PrimitiveMeta<bigint>
): ArrayMeta<bigint, T, PrimitiveMeta<bigint>> => ({
    type: type,
    tryParseValue: toArray,
    toJson: (m, value) => `[${value.join(',')}]`,
    value: value
})

export const map = <M extends BaseMeta<ExtractType<M>, M>>(value: M): MapMeta<ExtractType<M>, M> => ({
    type: JSONT.MAP,
    key: string(),
    value: value,
    tryParseValue: tryParseMap,
    toJson: (m, v, o) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.entries()].map(c => `"${c[0]}": ${toJson(meta, c[1], o)}`).join(',')}}`
    }
})

export const set = <M extends BaseMeta<ExtractType<M>, M>>(value: M): SetMeta<ExtractType<M>, M> => ({
    type: JSONT.SET,
    value: value,
    tryParseValue: tryParseSet,
    toJson: (m, v, o) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.values()].map(v => toJson(meta, v, o)).join(',')}}`
    }
})

export const field = <K extends string, M extends BaseMeta<ExtractType<M>, M>>(
    name: K, value: M, encoder: TextEncoder = new TextEncoder()
): ObjectFieldMeta<K, ExtractType<M>, M> => {
    return {
        name: {
            value: name,
            bytes: encoder.encode(name)
        },
        value: value
    }
}

export type ObjectFromFields<T extends ObjectFieldMeta<string, any, any>[]> =
    Expand<{
        [E in T[number]as E['name']['value']]: E['value']
    }>

export const object = <M extends ObjectFieldMeta<any, any, any>[]>(...fields: M): ObjectMeta<ObjectFromFields<M>> => {
    const keys = fields.map(f => f.name.value as string)
    const factory = genObjectFactory(keys) as any

    const keysBytes = fields.map(f => f.name.bytes)
    const fieldIndex = generateTrieSwitch(keysBytes, {
        pack: true
    }) as any

    const toJson = genObjectToJsonFactory1(...fields)

    return {
        type: JSONT.OBJECT,
        fields: fields,
        build: factory,
        getFieldIndex: fieldIndex,
        tryParseValue: tryParseObject,
        toJson: toJson
    }
}