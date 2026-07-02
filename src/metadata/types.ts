import { JsonOptions } from "../options"
import { ReadResult } from "../utils/types"
import { BaseType } from "./baseTypes"

export type TypeName = BaseType | (string & { __typeName: never })

export type ConvertCtx = {
    readonly raw?: string,
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type toValueConverter<T, M extends BaseMeta<T, M>> =
    (context: ConvertCtx, metadata: M, index: number, depth: number) => ReadResult<T>

export type toJsonConverter<T, M extends BaseMeta<T, M>> = (value: T, metadata: M, options: JsonOptions) => string

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly toValue: toValueConverter<T, M>,
    readonly toJson: toJsonConverter<T, M>,
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export interface ObjectMeta<T> extends BaseMeta<T, ObjectMeta<T>> {
    readonly fields: ObjectFields<T>
    readonly build: (values: T[keyof T][]) => T
    readonly getFieldIndex: (bytes: Uint8Array, offset: number) => number
}

export type ObjectFields<T> = {
    [K in Extract<keyof T, string>]: ObjectFieldMeta<K, T[K], BaseMeta<T[K], any>>
}[Extract<keyof T, string>][]

export type ObjectFieldMeta<K extends string, T, M extends BaseMeta<T, M>> = M & {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
}

export type ObjectFromMeta<T extends ObjectFieldMeta<any, any, any>[]> = Expand<{
    [E in T[number]as E['name']['value']]: E['toValue'] extends toValueConverter<infer U, any> ? U : never
}>

export interface NullableMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<T | null, NullableMeta<T, M>> {
    readonly value: M
}

export interface CollectionMeta<C, T, M extends BaseMeta<T, M>> extends BaseMeta<C, CollectionMeta<C, T, M>> {
    readonly value: M
}

export interface MapMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<Map<string, T>, MapMeta<T, M>> {
    readonly key: PrimitiveMeta<string>
    readonly value: M
}

export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type ExtractType<M> = M extends BaseMeta<infer U, any> ? U : never
