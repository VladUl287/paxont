import { toArray } from "../converters/array"
import { BigIntTypedArray, FloatTypedArray, IntegerTypedArray, TypedArray } from "../utils/typedArray"
import {
    ArrayMeta,
    BaseMeta, Expand, ExtractType, MapMeta, Modifier, NullableMeta, ObjectFieldMeta,
    ObjectMeta, PrimitiveMeta, SetMeta, ToValueConverter
} from "./types"
import { BaseType, JSONT } from "./baseTypes"
import { toDate } from "../converters/date"
import { toMap } from "../converters/map"
import { toSet } from "../converters/set"
import { genObjectFactory, genObjectToJsonFactory1 } from "../code_gen/object"
import { generateTrieSwitch } from "../code_gen/field"
import { toObject } from "../converters/object"
import { toNullable } from "../converters/nullable"
import { tryParseBigInt, toInt64, toUint64 } from "../converters/number/bigint"
import { toBoolean } from "../converters/boolean"
import { toString } from "../converters/string"
import { ArrayPool, useArrayPool } from "../utils/array"
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from "../converters/number/int"
import { toFloat } from "../converters/number/float"

export const string = () => primitive(JSONT.STRING, toString)
export const number = () => primitive(JSONT.NUMBER, toFloat)
export const bigInt = () => primitive(JSONT.BIGINT, tryParseBigInt)
export const bool = () => primitive(JSONT.BOOL, toBoolean)
export const date = () => primitive(JSONT.DATE, toDate)

export const u8 = () => primitive(JSONT.U8, toUint8)
export const u16 = () => primitive(JSONT.U16, toUint16)
export const u32 = () => primitive(JSONT.U32, toUint32)
export const i8 = () => primitive(JSONT.I8, toInt8)
export const i16 = () => primitive(JSONT.I16, toInt16)
export const i32 = () => primitive(JSONT.I32, toInt32)

export const u64 = () => primitive(JSONT.U64, toUint64)
export const i64 = () => primitive(JSONT.I64, toInt64)

const primitive = <T extends Object>(type: BaseType, toValue: ToValueConverter<T, PrimitiveMeta<T>>): PrimitiveMeta<T> => ({
    type: type,
    toValue: toValue,
    toJson: (s, _) => s.toString()
})

export const nullable = <M extends BaseMeta<ExtractType<M>, M>>(value: M): NullableMeta<ExtractType<M>, M> => ({
    type: JSONT.NULLABLE,
    toJson: (meta, value, options) => {
        if (value === null) return 'null'
        return meta.value.toJson(meta.value, value, options)
    },
    toValue: toNullable,
    value: value,
})

export const arrayPool =
    <T, A extends ArrayLike<T>>(pool: ArrayPool<A>) =>
        <M extends ArrayMeta<ExtractType<M>, ExtractType<M>[], any>>(metadata: M): M => ({
            ...metadata,
            arrayPool: pool
        })

const globalPools: Record<string, ArrayPool<any>> = Object.freeze({
    number: useArrayPool(Float64Array),
    u8: useArrayPool(Uint8Array),
    string: useArrayPool<Array<string>>(Array),
    object: useArrayPool<Array<number>>(Array),
    undefined: useArrayPool(Array)
})

export const array = <T, M extends BaseMeta<T, M>>(
    value: M,
    ...modifiers: Modifier<ArrayMeta<T, T[], M>>[]
): ArrayMeta<T, T[], M> => {
    let defaultMeta: ArrayMeta<T, T[], M> = {
        type: JSONT.ARRAY,
        toValue: toArray,
        toJson: (meta, value, options) => {
            const metaValue = meta.value
            const toJson = metaValue.toJson
            return `[${value.map(c => toJson(metaValue, c, options)).join(',')}]`
        },
        value: value,
        arrayPool: globalPools[value.type] ?? useArrayPool(Array)
    }

    return modifiers.reduce((value, modify) => modify(value), defaultMeta)
}

export const u8Array = () => typedArray<Uint8Array>(JSONT.U8_ARRAY, u8())
export const u16Array = () => typedArray<Uint16Array>(JSONT.U16_ARRAY, u16())
export const u32Array = () => typedArray<Uint32Array>(JSONT.U32_ARRAY, u32())
export const u64Array = () => bigIntTypedArray<BigUint64Array>(JSONT.U32_ARRAY, u64())

export const i8Array = () => typedArray<Int8Array>(JSONT.I8_ARRAY, i8())
export const i16Array = () => typedArray<Int16Array>(JSONT.I16_ARRAY, i16())
export const i32Array = () => typedArray<Int32Array>(JSONT.I32_ARRAY, i32())
export const i64Array = () => bigIntTypedArray<BigInt64Array>(JSONT.I64_ARRAY, i64())

export const f64Array = () => typedArray<Float64Array>(JSONT.F64_ARRAY, number())

const typedArray = <T extends IntegerTypedArray | FloatTypedArray>(
    type: BaseType, value: PrimitiveMeta<number>
): ArrayMeta<number, T, PrimitiveMeta<number>> => ({
    type: type,
    toValue: toArray,
    toJson: (m, value) => `[${value.join(',')}]`,
    value: value,
    arrayPool: globalPools[value.type]
})

const bigIntTypedArray = <T extends BigIntTypedArray>(
    type: BaseType, value: PrimitiveMeta<bigint>
): ArrayMeta<bigint, T, PrimitiveMeta<bigint>> => ({
    type: type,
    toValue: toArray,
    toJson: (m, value) => `[${value.join(',')}]`,
    value: value,
    arrayPool: globalPools[value.type]
})

export const map = <M extends BaseMeta<ExtractType<M>, M>>(value: M): MapMeta<ExtractType<M>, M> => ({
    type: JSONT.MAP,
    key: string(),
    value: value,
    toValue: toMap,
    toJson: (m, v, o) => {
        const meta = m.value
        const toJson = meta.toJson
        return `{${[...v.entries()].map(c => `"${c[0]}": ${toJson(meta, c[1], o)}`).join(',')}}`
    }
})

export const set = <T, M extends BaseMeta<T, M>>(value: M, ...modifiers: Modifier<SetMeta<T, M>>[]): SetMeta<T, M> => {
    const defaultMeta: SetMeta<T, M> = {
        type: JSONT.SET,
        value: value,
        toValue: toSet,
        toJson: (meta, set, options) => {
            const valueMeta = meta.value
            const toJson = valueMeta.toJson
            const values = Array.from(set)
                .map(value => toJson(valueMeta, value, options))
                .join(',')
            return `[${values}]`
        }
    }

    return modifiers.reduce((value, modify) => modify(value), defaultMeta)
}

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
        toValue: toObject,
        toJson: toJson
    }
}