import { toArray } from "../converters/toValue/array"
import {
    ArrayMeta,
    BaseMeta, MetaValue, MapMeta, NullableMeta, ObjectField,
    ObjectMeta, PrimitiveMeta, SetMeta,
    TypeName
} from "./types"
import { ARRAY, BaseType, BIGINT, BOOL, DATE, F64_ARRAY, I16, I16_ARRAY, I32, I32_ARRAY, I64, I64_ARRAY, I8, I8_ARRAY, MAP, NULLABLE, NUMBER, OBJECT, SET, STRING, U16, U16_ARRAY, U32, U32_ARRAY, U64, U64_ARRAY, U8, U8_ARRAY, } from "./baseTypes"
import { toDate } from "../converters/toValue/date"
import { toMap } from "../converters/toValue/map"
import { toSet } from "../converters/toValue/set"
import { genObjectFactory, genObjectToJsonFactory } from "../code_gen/object"
import { generateTrie } from "../code_gen/trie"
import { toObject } from "../converters/toValue/object"
import { toNullable } from "../converters/toValue/nullable"
import { toBigInt, toInt64, toUint64 } from "../converters/toValue/number/bigint"
import { toBoolean } from "../converters/toValue/boolean"
import { toString } from "../converters/toValue/string"
import { ArrayLikeWritable, ArrayPool, BigIntTypedArray, FloatTypedArray, IntegerTypedArray, arrayPool } from "../utils/array"
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from "../converters/toValue/number/int"
import { toFloat } from "../converters/toValue/number/float"
import { Expand, IsAny } from "../utils/types"
import { bigIntToJson, i16ToJson, i32ToJson, i64ToJson, i8ToJson, numberToJson, u16ToJson, u32ToJson, u64ToJson, u8ToJson } from "../converters/toJson/number"
import { stringToJson } from "../converters/toJson/string"
import { boolToJson } from "../converters/toJson/bool"
import { dateToJson } from "../converters/toJson/date"
import { arrayToJson } from "../converters/toJson/array"
import { metaToJson } from "../converters/toJson/map"
import { setToJson } from "../converters/toJson/set"

export type Modifier<M extends BaseMeta<any>> = (metadata: M) => M

export type BuilderOptions = {
    readonly globalPools: Record<TypeName, ArrayPool<any>>,
    readonly arrayPoolFactory: typeof arrayPool
}

const defaultBuilderOptions: BuilderOptions = {
    globalPools: {
        number: arrayPool<Array<number>>(Array, 0),
        string: arrayPool<Array<string>>(Array, ''),
        object: arrayPool<Array<object>>(Array, {}),
        boolean: arrayPool<Array<boolean>>(Array, false),
        date: arrayPool<Array<Date>>(Array, Date.prototype),
        bigint: arrayPool<Array<bigint>>(Array, 0n),
        set: arrayPool<Array<Set<any>>>(Array, new Set()),
        map: arrayPool<Array<Map<string, any>>>(Array, new Map()),
        array: arrayPool<Array<object>>(Array, {}),
        nullable: arrayPool(Array, null),
        i8: arrayPool(Int8Array, 0),
        i16: arrayPool(Int16Array, 0),
        i32: arrayPool(Int32Array, 0),
        i64: arrayPool(BigInt64Array, 0n),
        u8: arrayPool(Uint8Array, 0),
        u16: arrayPool(Uint16Array, 0),
        u32: arrayPool(Uint32Array, 0),
        u64: arrayPool(BigUint64Array, 0n),
        'i8[]': arrayPool<Array<Int8Array>>(Array, new Int8Array()),
        'i16[]': arrayPool<Array<Int16Array>>(Array, new Int16Array()),
        'i32[]': arrayPool<Array<Int32Array>>(Array, new Int32Array()),
        'i64[]': arrayPool<Array<BigInt64Array>>(Array, new BigInt64Array()),
        'u8[]': arrayPool<Array<Uint8Array>>(Array, new Uint8Array()),
        'u16[]': arrayPool<Array<Uint16Array>>(Array, new Uint16Array()),
        'u32[]': arrayPool<Array<Uint32Array>>(Array, new Uint32Array()),
        'u64[]': arrayPool<Array<BigUint64Array>>(Array, new BigUint64Array()),
        'f64[]': arrayPool<Array<Float64Array>>(Array, new Float64Array()),
    },
    arrayPoolFactory: arrayPool
}

export function builder(options: BuilderOptions = defaultBuilderOptions) {
    const { globalPools, arrayPoolFactory } = {
        ...defaultBuilderOptions,
        ...options
    }

    function applyModifier<M extends BaseMeta<any>>(value: M, modify: Modifier<M>): M {
        return Object.assign({}, modify(value), { type: value.type })
    }

    const string = (...modifiers: Modifier<PrimitiveMeta<string>>[]) =>
        primitive(STRING, toString, stringToJson, ...modifiers)

    const number = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(NUMBER, toFloat, numberToJson, ...modifiers)

    const bigInt = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
        primitive(BIGINT, toBigInt, bigIntToJson, ...modifiers)

    const u8 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(U8, toUint8, u8ToJson, ...modifiers)

    const u16 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(U16, toUint16, u16ToJson, ...modifiers)

    const u32 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(U32, toUint32, u32ToJson, ...modifiers)

    const i8 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(I8, toInt8, i8ToJson, ...modifiers)

    const i16 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(I16, toInt16, i16ToJson, ...modifiers)

    const i32 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(I32, toInt32, i32ToJson, ...modifiers)

    const u64 = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
        primitive(U64, toUint64, u64ToJson, ...modifiers)

    const i64 = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
        primitive(I64, toInt64, i64ToJson, ...modifiers)

    const bool = (...modifiers: Modifier<PrimitiveMeta<boolean>>[]) =>
        primitive(BOOL, toBoolean, boolToJson, ...modifiers)

    const date = (...modifiers: Modifier<PrimitiveMeta<Date>>[]) =>
        primitive(DATE, toDate, dateToJson, ...modifiers)

    const primitive = <T>(
        type: BaseType,
        toValue: PrimitiveMeta<T>['toValue'],
        toJson: PrimitiveMeta<T>['toJson'],
        ...modifiers: Modifier<PrimitiveMeta<T>>[]
    ): PrimitiveMeta<T> => {
        return modifiers.reduce(applyModifier, <PrimitiveMeta<T>>{
            type,
            toValue,
            toJson
        })
    }

    const nullable = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<NullableMeta<M>>[]
    ): NullableMeta<M> => {
        return modifiers.reduce(applyModifier, <NullableMeta<M>>{
            type: NULLABLE,
            toJson: (meta, value, options) => {
                if (value === null) return 'null'
                return meta.value.toJson(meta.value, value, options)
            },
            toValue: toNullable,
            value: value
        })
    }

    const array = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<ArrayMeta<MetaValue<M>[], M>>[]
    ): ArrayMeta<MetaValue<M>[], M> => {
        return modifiers.reduce(applyModifier, <ArrayMeta<MetaValue<M>[], M>>{
            type: ARRAY,
            toValue: toArray,
            toJson: arrayToJson,
            value: value,
            pool: (globalPools[value.type] ??= arrayPoolFactory(Array, undefined))
        })
    }

    const u8Array = (...modifiers: Modifier<ArrayMeta<Uint8Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Uint8Array>(Uint8Array, U8_ARRAY, u8(), ...modifiers)

    const u16Array = (...modifiers: Modifier<ArrayMeta<Uint16Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Uint16Array>(Uint16Array, U16_ARRAY, u16(), ...modifiers)

    const u32Array = (...modifiers: Modifier<ArrayMeta<Uint32Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Uint32Array>(Uint32Array, U32_ARRAY, u32(), ...modifiers)

    const u64Array = (...modifiers: Modifier<ArrayMeta<BigUint64Array, PrimitiveMeta<bigint>>>[]) =>
        bigIntTypedArray<BigUint64Array>(BigUint64Array, U64_ARRAY, u64(), ...modifiers)

    const i8Array = (...modifiers: Modifier<ArrayMeta<Int8Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Int8Array>(Int8Array, I8_ARRAY, i8(), ...modifiers)

    const i16Array = (...modifiers: Modifier<ArrayMeta<Int16Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Int16Array>(Int16Array, I16_ARRAY, i16(), ...modifiers)

    const i32Array = (...modifiers: Modifier<ArrayMeta<Int32Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Int32Array>(Int32Array, I32_ARRAY, i32(), ...modifiers)

    const i64Array = (...modifiers: Modifier<ArrayMeta<BigInt64Array, PrimitiveMeta<bigint>>>[]) =>
        bigIntTypedArray<BigInt64Array>(BigInt64Array, I64_ARRAY, i64(), ...modifiers)

    const f64Array = (...modifiers: Modifier<ArrayMeta<Float64Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Float64Array>(Float64Array, F64_ARRAY, number(), ...modifiers)

    const typedArray = <T extends ArrayLikeWritable<number> & (IntegerTypedArray | FloatTypedArray)>(
        ctor: new (length: number) => T,
        type: BaseType,
        value: PrimitiveMeta<number>,
        ...modifiers: Modifier<ArrayMeta<T, PrimitiveMeta<number>>>[]
    ): ArrayMeta<T, PrimitiveMeta<number>> => {
        return modifiers.reduce(applyModifier, <ArrayMeta<T, PrimitiveMeta<number>>>{
            type: type,
            toValue: toArray,
            toJson: arrayToJson,
            value: value,
            pool: (globalPools[value.type] ??= arrayPoolFactory<ArrayLikeWritable<number>>(ctor, 0))
        })
    }

    const bigIntTypedArray = <T extends ArrayLikeWritable<bigint> & BigIntTypedArray>(
        ctor: new (length: number) => T,
        type: BaseType,
        value: PrimitiveMeta<bigint>,
        ...modifiers: Modifier<ArrayMeta<T, PrimitiveMeta<bigint>>>[]
    ): ArrayMeta<T, PrimitiveMeta<bigint>> => {
        return modifiers.reduce(applyModifier, <ArrayMeta<T, PrimitiveMeta<bigint>>>{
            type: type,
            toValue: toArray,
            toJson: arrayToJson,
            value: value,
            pool: (globalPools[value.type] ??= arrayPoolFactory<ArrayLikeWritable<bigint>>(ctor, 0n))
        })
    }

    const map = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<MapMeta<M>>[]
    ): MapMeta<M> => {
        return modifiers.reduce(applyModifier, <MapMeta<M>>{
            type: MAP,
            key: string(),
            value: value,
            toValue: toMap,
            toJson: metaToJson
        })
    }

    const set = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<SetMeta<M>>[]
    ): SetMeta<M> => {
        return modifiers.reduce(applyModifier, <SetMeta<M>>{
            type: SET,
            value: value,
            toValue: toSet,
            toJson: setToJson
        })
    }

    type CombineModifiers<Mod extends Modifier<any>[]> =
        Mod extends [infer First, ...infer Rest] ?
        (First extends Modifier<any> ?
            (ReturnType<First> extends ObjectMeta<infer U> ?
                (IsAny<U> extends true ? {} : U) & (Rest extends Modifier<any>[] ? CombineModifiers<Rest> : {}) :
                never) :
            never
        ) :
        unknown

    type AsObjectMetaValue<M extends Modifier<ObjectMeta<any>>[]> = Expand<CombineModifiers<M>>

    const defaultBuilder = (_values: any[]): any => ({})
    const defaultFieldIndex = (_bytes: Uint8Array<ArrayBufferLike>, _offset: number) => -1
    const defaultToJson = (_metadata: ObjectMeta<any>, _value: any, _options: any) => ''

    const replaceDefaultToJsonModifier: Modifier<ObjectMeta<any>> = (meta) => {
        return meta.toJson === defaultToJson ?
            { ...meta, toJson: genObjectToJsonFactory(meta.fields) } :
            meta
    }

    const replaceDefaultFieldIndexModifier: Modifier<ObjectMeta<any>> = (meta) => {
        return meta.getFieldIndex === defaultFieldIndex ?
            { ...meta, getFieldIndex: generateTrie(meta.fields.map(f => f.name.bytes)) } :
            meta
    }

    const replaceDefaultBuilderModifier: Modifier<ObjectMeta<any>> = (meta) => {
        return meta.build === defaultBuilder ?
            { ...meta, build: genObjectFactory(meta.fields) } :
            meta
    }

    const object = <M extends Modifier<ObjectMeta<any>>[]>(...modifiers: M): ObjectMeta<AsObjectMetaValue<M>> => {
        const defaultObjectMeta: ObjectMeta<AsObjectMetaValue<M>> = {
            type: OBJECT,
            toValue: toObject,
            fields: [],
            toJson: defaultToJson,
            build: defaultBuilder,
            getFieldIndex: defaultFieldIndex
        }

        return [
            ...modifiers,
            replaceDefaultToJsonModifier,
            replaceDefaultFieldIndexModifier,
            replaceDefaultBuilderModifier
        ].reduce(applyModifier, defaultObjectMeta)
    }

    return {
        string,
        number,
        bigInt,
        bool,
        date,
        nullable,
        i8, i16, i32, i64,
        u8, u16, u32, u64,
        array,
        i8Array, i16Array, i32Array, i64Array,
        u8Array, u16Array, u32Array, u64Array,
        f64Array,
        map, set,
        object
    }
}

export const {
    string,
    number,
    bigInt,
    bool,
    date,
    nullable,
    i8, i16, i32, i64,
    u8, u16, u32, u64,
    array,
    i8Array, i16Array, i32Array, i64Array,
    u8Array, u16Array, u32Array, u64Array,
    f64Array,
    map, set,
    object
} = builder(defaultBuilderOptions)
