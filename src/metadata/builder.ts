import { toArray } from "../converters/toValue/array"
import { toFloat64 } from "../converters/toValue/float"
import { toInt } from "../converters/toValue/int"
import { toString } from "../converters/toValue/string"
import { TypedArray } from "../utils/typedArray"
import { BaseMeta, CollectionMeta, ObjectFieldMeta, ObjectMeta, toValueConverter, TypeName } from "./types"

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type ObjectFromMeta<T extends ObjectFieldMeta<any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U> ? U : never
}>

const string = (): BaseMeta<string> => ({
    type: 'string',
    toValue: toString,
    toJson: (s, _m) => s
})

const number = (): BaseMeta<number> => ({
    type: 'number',
    toValue: toFloat64,
    toJson: (s, _m) => s.toString()
})

const array = <T>(value: BaseMeta<T>): CollectionMeta<Array<T>, T> => ({
    type: 'array',
    toValue: toArray as any,
    toJson: (s, _m) => `[${s.join(',')}]`,
    value: value
})

const u8 = (): BaseMeta<number> => ({
    type: 'u8',
    toValue: toInt,
    toJson: (s, _m) => s.toString()
})

const u16 = (): BaseMeta<number> => ({
    type: 'u16',
    toValue: toInt,
    toJson: (s, _m) => s.toString()
})

const u32 = (): BaseMeta<number> => ({
    type: 'u32',
    toValue: toInt,
    toJson: (s, _m) => s.toString()
})

const u8Array = (): CollectionMeta<Uint8Array, number> => typedArray('u8[]', u8())

const typedArray = <T extends TypedArray>(type: TypeName, value: BaseMeta<number>): CollectionMeta<T, number> => ({
    type: type,
    toValue: toArray as any,
    toJson: (s, _m) => `[${s.join(',')}]`,
    value: value
})

const field = <K extends string, T>(name: K, value: BaseMeta<T>): ObjectFieldMeta<K, T> => {
    return {} as any
}

export const object = <M extends ObjectFieldMeta<any, any>[]>(...fields: M): ObjectMeta<ObjectFromMeta<M>> => {
    return {} as any
}

const obj = object(
    field("id", number()),
    field("name", string()),
    field("tags", array(string())),
    field("deltas", u8Array()),
    field("role", object(
        field("id", number()),
        field("value", string())
    ))
)