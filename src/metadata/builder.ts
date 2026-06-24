import { toFloat64 } from "../converters/toValue/float"
import { toString } from "../converters/toValue/string"
import { BaseMeta, ObjectFieldMeta, ObjectMeta, toValueConverter } from "./types"

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

const field = <K extends string, T>(name: K, value: BaseMeta<T>): ObjectFieldMeta<K, T> => {
    return {} as any
}

export const object = <M extends ObjectFieldMeta<any, any>[]>(...fields: M): ObjectMeta<ObjectFromMeta<M>> => {
    return {} as any
}

const obj = object(
    field("id", number()),
    field("name", string()),
    field("role", object(
        field("id", number()),
        field("value", string())
    ))
)