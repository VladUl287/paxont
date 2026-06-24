import { generateTrieSwitch } from "../code_gen/field"
import { genObjectFactory, genObjectToJsonFactory } from "../code_gen/object"
import { toFloat64 } from "../converters/toValue/float"
import { convertObject } from "../converters/toValue/object"
import { toString } from "../converters/toValue/string"
import { BaseMeta, ObjectFieldMeta, ObjectFields, ObjectMeta, toValueConverter, TypeName } from "./types"

type Test<K, T> = { key: K; value: T }

type ObjectFromTests<T extends Test<any, any>[]> = {
    // [E in T[number]as E['key']]: E['value']
    [E in T[number]as E['key']]: E['value']
};

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

const obj1 = <M extends Test<any, any>[]>(...tests: M): Expand<ObjectFromTests<M>> => {
    return {} as any
}

const instance = obj1(
    { key: 'id', value: 'value' } as Test<'id', string>,
    { key: 'name', value: 1 } as Test<'name', number>
)

const field = <K extends string, T>(name: K, value: BaseMeta<T>): ObjectFieldMeta<K, T> => {
    return {} as any
}

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

type ObjectFromMetas<T extends ObjectFieldMeta<any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U> ? U : never
}>

// export const object = <T extends Record<string, any>>(...fieldMetas: ObjectFields<T>): ObjectMeta<T> => {
export const object = <M extends ObjectFieldMeta<any, any>[]>(...fieldMetas: M): ObjectMeta<ObjectFromMetas<M>> => {
    return {} as any
    // const keys = fieldMetas.map(f => f.name.value as string)
    // const factory = genObjectFactory(keys) as (values: T[keyof T][]) => T

    // const keysBytes = fieldMetas.map(f => f.name.bytes)
    // const fieldIndex = generateTrieSwitch(keysBytes, {
    //     pack: true
    // }) as any

    // const result = {
    //     type: 'object',
    //     fields: fieldMetas,
    //     factory: factory,
    //     fieldIndexResolver: fieldIndex,
    //     toValue: convertObject as any,
    //     toJson: (() => { }) as any,
    // }

    // result.toJson = genObjectToJsonFactory<T>(result)

    // return result
}



const obj = object(
    field("id", number()),
    field("name", string())
)