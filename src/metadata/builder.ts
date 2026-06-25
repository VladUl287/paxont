import { toArray } from "../converters/toValue/array"
import { toFloat64 } from "../converters/toValue/float"
import { toString } from "../converters/toValue/string"
import { BaseMeta, CollectionMeta, ObjectFieldMeta, ObjectMeta, toValueConverter } from "./types"

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
type Extract<M> = M extends BaseMeta<infer U, any> ? U : never
type ObjectFromMeta<T extends ObjectFieldMeta<any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U, any> ? U : never
}>

const string = (): BaseMeta<string> => ({
    type: 'string',
    toValue: toString,
    toJson: (s, _) => s
})

const number = (): BaseMeta<number> => ({
    type: 'number',
    toValue: toFloat64,
    toJson: (s, _) => s.toString()
})

const array = <T extends BaseMeta<any, any>>(value: T): CollectionMeta<Array<Extract<T>>, Extract<T>> => ({
    type: 'array',
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
    field("coordinates", array(
        object(
            field("id", number()),
            field("value", string())
        )
    )),
    field("role", object(
        field("id", number()),
        field("value", string())
    ))
)