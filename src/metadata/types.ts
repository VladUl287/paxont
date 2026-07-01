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

export type toJsonConverter<T, M extends BaseMeta<T, M>> = (value: T, meta: M) => string

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
    [K in keyof T]: ObjectFieldMeta<K, T[K]>
}[keyof T][]

export type ObjectFieldMeta<K, T> = BaseMeta<T, ObjectFieldMeta<K, T>> & {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
}

export interface NullableMeta<T> extends BaseMeta<T, NullableMeta<T>> {
    readonly value: BaseMeta<T, any>
}

export interface CollectionMeta<T, V> extends BaseMeta<T, CollectionMeta<T, V>> {
    readonly value: BaseMeta<V, any>
}

export interface MapMeta<V> extends BaseMeta<Map<string, V>, MapMeta<V>> {
    readonly key: PrimitiveMeta<string>
    readonly value: BaseMeta<V, any>
}
