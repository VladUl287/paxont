import { toArray } from "../converters/toValue/array"
import { toBigInt } from "../converters/toValue/bigint"
import { toFloat64 } from "../converters/toValue/float"
import { toInt } from "../converters/toValue/int"
import { toString } from "../converters/toValue/string"
import { TypedArray } from "../utils/typedArray"
import { BaseMeta, CollectionMeta, ObjectFieldMeta, ObjectMeta, PrimitiveMeta, toValueConverter, TypeName } from "./types"
import { JSONT_I16, JSONT_I16_ARRAY, JSONT_I32, JSONT_I32_ARRAY, JSONT_I8, JSONT_I8_ARRAY, JSONT_U16, JSONT_U16_ARRAY, JSONT_U32, JSONT_U32_ARRAY, JSONT_U8, JSONT_U8_ARRAY } from "./baseTypes"

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
type Extract<M> = M extends BaseMeta<infer U, any> ? U : never
type ObjectFromMeta<T extends ObjectFieldMeta<any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U, any> ? U : never
}>

const string = (): PrimitiveMeta<string> => ({
    type: 'string',
    toValue: toString,
    toJson: (s, _) => s
})

const number = (): PrimitiveMeta<number> => ({
    type: 'number',
    toValue: toFloat64,
    toJson: (s, _) => s.toString()
})

const bigInt = (): PrimitiveMeta<bigint> => ({
    type: 'bigint',
    toValue: toBigInt,
    toJson: (s, _) => s.toString()
})

const u8 = (): PrimitiveMeta<number> => integer(JSONT_U8)
const u16 = (): PrimitiveMeta<number> => integer(JSONT_U16)
const u32 = (): PrimitiveMeta<number> => integer(JSONT_U32)
const i8 = (): PrimitiveMeta<number> => integer(JSONT_I8)
const i16 = (): PrimitiveMeta<number> => integer(JSONT_I16)
const i32 = (): PrimitiveMeta<number> => integer(JSONT_I32)

const integer = (type: TypeName): PrimitiveMeta<number> => ({
    type: type,
    toValue: toInt,
    toJson: (s, _) => s.toString()
})

const array = <T extends BaseMeta<any, any>>(value: T): CollectionMeta<Array<Extract<T>>, Extract<T>> => ({
    type: 'array',
    toValue: toArray,
    toJson: (s, _) => `[${s.join(',')}]`,
    value: value
})

const u8Array = (): CollectionMeta<Uint8Array, number> => typedArray(JSONT_U8_ARRAY, u8())
const u16Array = (): CollectionMeta<Uint16Array, number> => typedArray(JSONT_U16_ARRAY, u16())
const u32Array = (): CollectionMeta<Uint32Array, number> => typedArray(JSONT_U32_ARRAY, u32())

const i8Array = (): CollectionMeta<Int8Array, number> => typedArray(JSONT_I8_ARRAY, i8())
const i16Array = (): CollectionMeta<Int16Array, number> => typedArray(JSONT_I16_ARRAY, i16())
const i32Array = (): CollectionMeta<Int32Array, number> => typedArray(JSONT_I32_ARRAY, i32())

const typedArray = <T extends TypedArray>(type: TypeName, value: PrimitiveMeta<number>): CollectionMeta<T, number> => ({
    type: type,
    toValue: toArray,
    toJson: (s, _) => `[${s.join(',')}]`,
    value: value
})

const field = <K extends string, M extends BaseMeta<any, any>>(
    name: K, value: M
): ObjectFieldMeta<K, Extract<M>> => {
    return {} as any
}

export const object = <M extends ObjectFieldMeta<any, any>[]>(...fields: M): ObjectMeta<ObjectFromMeta<M>> => {
    return {} as any
}

const obj = object(
    field("id", number()),
    field("name", string()),
    field("timestamps", u32Array()),
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