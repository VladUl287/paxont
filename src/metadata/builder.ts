import { toArray } from "../converters/array"
import {
    ArrayMeta,
    BaseMeta, Expand, ExtractType, MapMeta, Modifier, NullableMeta, ObjectFieldMeta,
    ObjectMeta, PrimitiveMeta, SetMeta
} from "./types"
import { BaseType, JSONT } from "./baseTypes"
import { toDate } from "../converters/date"
import { toMap } from "../converters/map"
import { toSet } from "../converters/set"
import { genObjectFactory, genObjectToJsonFactory } from "../code_gen/object"
import { generateTrie } from "../code_gen/trie"
import { toObject } from "../converters/object"
import { toNullable } from "../converters/nullable"
import { toBigInt, toInt64, toUint64 } from "../converters/number/bigint"
import { toBoolean } from "../converters/boolean"
import { toString } from "../converters/string"
import { ArrayLikeWritable, ArrayPool, BigIntTypedArray, FloatTypedArray, IntegerTypedArray, useArrayPool } from "../utils/array"
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from "../converters/number/int"
import { toFloat } from "../converters/number/float"

export const string = (...modifiers: Modifier<PrimitiveMeta<string>>[]) =>
    primitive(JSONT.STRING, toString, (v) => `"${v}"`, ...modifiers)

export const number = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.NUMBER, toFloat, (v) => v.toString(), ...modifiers)

export const bigInt = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
    primitive(JSONT.BIGINT, toBigInt, (v) => v.toString(), ...modifiers)

export const bool = (...modifiers: Modifier<PrimitiveMeta<boolean>>[]) =>
    primitive(JSONT.BOOL, toBoolean, (v) => v.toString(), ...modifiers)

export const date = (...modifiers: Modifier<PrimitiveMeta<Date>>[]) =>
    primitive(JSONT.DATE, toDate, (v) => `"${v.toISOString()}"`, ...modifiers)

export const u8 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.U8, toUint8, (v) => v.toString(), ...modifiers)

export const u16 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.U16, toUint16, (v) => v.toString(), ...modifiers)

export const u32 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.U32, toUint32, (v) => v.toString(), ...modifiers)

export const i8 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.I8, toInt8, (v) => v.toString(), ...modifiers)

export const i16 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.I16, toInt16, (v) => v.toString(), ...modifiers)

export const i32 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
    primitive(JSONT.I32, toInt32, (v) => v.toString(), ...modifiers)

export const u64 = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
    primitive(JSONT.U64, toUint64, (v) => v.toString(), ...modifiers)

export const i64 = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
    primitive(JSONT.I64, toInt64, (v) => v.toString(), ...modifiers)

function applyModifier<M extends BaseMeta<any, M>>(value: M, modify: Modifier<M>): M {
    return Object.assign({}, modify(value), { type: value.type })
}
const primitive = <T>(
    type: BaseType,
    toValue: PrimitiveMeta<T>['toValue'],
    toJson: (value: T) => string,
    ...modifiers: Modifier<PrimitiveMeta<T>>[]
): PrimitiveMeta<T> => {
    const defaultMeta: PrimitiveMeta<T> = {
        type: type,
        toValue: toValue,
        toJson: (m, v, _) => toJson(v)
    }
    return modifiers.reduce(applyModifier, defaultMeta)
}

export const nullable = <M extends BaseMeta<ExtractType<M>, M>>(
    value: M,
    ...modifiers: Modifier<NullableMeta<ExtractType<M>, M>>[]
): NullableMeta<ExtractType<M>, M> => {
    const defaultMeta: NullableMeta<ExtractType<M>, M> = {
        type: JSONT.NULLABLE,
        toJson: (meta, value, options) => {
            if (value === null) return 'null'
            return meta.value.toJson(meta.value, value, options)
        },
        toValue: toNullable,
        value: value
    }
    return modifiers.reduce(applyModifier, defaultMeta)
}

export const arrayPool =
    <A extends ArrayLike<any>>(pool: ArrayPool<A>) =>
        <M extends ArrayMeta<any, A, any>>(metadata: M): M => ({
            ...metadata,
            pool: pool
        })

const globalPools: Record<string, ArrayPool<any>> = Object.freeze({
    number: useArrayPool<Array<number>>(Array),
    string: useArrayPool<Array<string>>(Array),
    object: useArrayPool<Array<object>>(Array),
    undefined: useArrayPool<Array<any>>(Array),
    i8: useArrayPool(Int8Array),
    i16: useArrayPool(Int16Array),
    i32: useArrayPool(Int32Array),
    i64: useArrayPool(BigInt64Array),
    u8: useArrayPool(Uint8Array),
    u16: useArrayPool(Uint16Array),
    u32: useArrayPool(Uint32Array),
    u64: useArrayPool(BigUint64Array),
})

export const array = <M extends BaseMeta<ExtractType<M>, M>>(
    value: M,
    ...modifiers: Modifier<ArrayMeta<ExtractType<M>, ExtractType<M>[], M>>[]
): ArrayMeta<ExtractType<M>, ExtractType<M>[], M> => {
    let defaultMeta: ArrayMeta<ExtractType<M>, ExtractType<M>[], M> = {
        type: JSONT.ARRAY,
        toValue: toArray,
        toJson: (meta, value, options) => {
            const metaValue = meta.value
            const toJson = metaValue.toJson
            return `[${value.map(c => toJson(metaValue, c, options)).join(',')}]`
        },
        value: value,
        pool: globalPools[value.type] ?? useArrayPool(Array)
    }
    return modifiers.reduce(applyModifier, defaultMeta)
}

export const u8Array = () => typedArray<Uint8Array>(JSONT.U8_ARRAY, u8())
export const u16Array = () => typedArray<Uint16Array>(JSONT.U16_ARRAY, u16())
export const u32Array = () => typedArray<Uint32Array>(JSONT.U32_ARRAY, u32())
export const u64Array = () => bigIntTypedArray<BigUint64Array>(JSONT.U64_ARRAY, u64())

export const i8Array = () => typedArray<Int8Array>(JSONT.I8_ARRAY, i8())
export const i16Array = () => typedArray<Int16Array>(JSONT.I16_ARRAY, i16())
export const i32Array = () => typedArray<Int32Array>(JSONT.I32_ARRAY, i32())
export const i64Array = () => bigIntTypedArray<BigInt64Array>(JSONT.I64_ARRAY, i64())

export const f64Array = () => typedArray<Float64Array>(JSONT.F64_ARRAY, number())

const typedArray = <T extends ArrayLikeWritable<number> & (IntegerTypedArray | FloatTypedArray)>(
    type: BaseType,
    value: PrimitiveMeta<number>,
    ...modifiers: Modifier<ArrayMeta<number, T, PrimitiveMeta<number>>>[]
): ArrayMeta<number, T, PrimitiveMeta<number>> => {
    const defaultMeta: ArrayMeta<number, T, PrimitiveMeta<number>> = {
        type: type,
        toValue: toArray,
        toJson: (meta, value, options) => {
            const valueMeta = meta.value
            const values = [...value]
            const result = values
                .map(
                    function (this: typeof valueMeta, number: number) {
                        return valueMeta.toJson(valueMeta, number, options)
                    },
                    valueMeta)
                .join(',')
            return `[${result}]`
        },
        value: value,
        pool: globalPools[value.type]
    }
    return modifiers.reduce(applyModifier, defaultMeta)
}

const bigIntTypedArray = <T extends ArrayLikeWritable<bigint> & BigIntTypedArray>(
    type: BaseType,
    value: PrimitiveMeta<bigint>,
    ...modifiers: Modifier<ArrayMeta<bigint, T, PrimitiveMeta<bigint>>>[]
): ArrayMeta<bigint, T, PrimitiveMeta<bigint>> => {
    const defaultMeta: ArrayMeta<bigint, T, PrimitiveMeta<bigint>> = {
        type: type,
        toValue: toArray,
        toJson: (meta, value, options) => {
            const valueMeta = meta.value
            const values = [...value]
            const result = values
                .map(
                    function (this: typeof valueMeta, number: bigint) {
                        return valueMeta.toJson(valueMeta, number, options)
                    },
                    valueMeta)
                .join(',')
            return `[${result}]`
        },
        value: value,
        pool: globalPools[value.type]
    }
    return modifiers.reduce(applyModifier, defaultMeta)
}

export const map = <M extends BaseMeta<ExtractType<M>, M>>(
    value: M,
    ...modifiers: Modifier<MapMeta<ExtractType<M>, M>>[]
): MapMeta<ExtractType<M>, M> => {
    const defaultMeta: MapMeta<ExtractType<M>, M> = {
        type: JSONT.MAP,
        key: string(),
        value: value,
        toValue: toMap,
        toJson: (m, v, o) => {
            const meta = m.value
            const toJson = meta.toJson
            return `{${[...v.entries()].map(c => `"${c[0]}": ${toJson(meta, c[1], o)}`).join(',')}}`
        }
    }
    return modifiers.reduce(applyModifier, defaultMeta)
}

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
    return modifiers.reduce(applyModifier, defaultMeta)
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
    const fieldIndex = generateTrie(keysBytes) as any

    const toJson = genObjectToJsonFactory(fields.map(c => c.name.value))

    return {
        type: JSONT.OBJECT,
        fields: fields,
        build: factory,
        getFieldIndex: fieldIndex,
        toValue: toObject,
        toJson: toJson
    }
}