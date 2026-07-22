import { JsonOptions } from "../options"
import { ArrayPool, MutableArray } from "../utils/array"
import { Stack } from "../utils/structs"
import { ReadResult } from "../utils/types"
import { BaseType } from "./baseTypes"

export type TypeName = BaseType | (string & {})

export type JsonReader = {
    readonly bytes: Uint8Array
    readonly writable: boolean
}

export type ParseContext = {
    readonly reader: JsonReader,
    readonly options: JsonOptions,
    readonly stack: Stack<ConvertState>
}

export type ConvertState = {
    isContinued: boolean,
    [key: string]: any
}

export type ToValueConverter<T, M extends BaseMeta<T, M>> = 
    (metadata: M, context: ParseContext, index: number, depth: number) => ReadResult<T>

export type ToJsonConverter<T, M extends BaseMeta<T, M>> = (metadata: M, value: T, options: JsonOptions) => string

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly toValue: ToValueConverter<T, M>,
    readonly toJson: ToJsonConverter<T, M>,
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export interface ObjectMeta<M extends Record<string, BaseMeta<any, any>>>
    extends BaseMeta<ObjectFromMeta<M>, ObjectMeta<M>> {
    readonly fields: ObjectFields<M>
    readonly build: (values: ObjectFieldsValues<M>) => ObjectFromMeta<M>
    readonly getFieldIndex: (bytes: Uint8Array, offset: number) => number
}

export type ObjectFieldMeta<K extends string, T, M extends BaseMeta<T, M>> = {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
    readonly value: M
}

export type ObjectFieldsValues<T extends Record<string, BaseMeta<any, any>>, Keys extends (keyof T)[] = (keyof T)[]> = {
    [K in keyof Keys]: ExtractType<T[Keys[K] & keyof T]>
}

export type ObjectFields<T extends Record<string, BaseMeta<any, any>>, Keys extends (keyof T)[] = (keyof T)[]> = {
    [K in keyof Keys]: ObjectFieldMeta<Keys[K] & string, ExtractType<T[Keys[K] & keyof T]>, T[Keys[K] & keyof T]>
}

export type ObjectFromMeta<T extends Record<string, BaseMeta<any, any>>> =
    Expand<{
        [E in keyof T]: T[E] extends BaseMeta<infer U, any> ? U : never
    }>

export interface NullableMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<T | null, NullableMeta<T, M>> {
    readonly value: M
}

export interface ArrayMeta<T, A extends MutableArray<T>, M extends BaseMeta<T, M>> extends BaseMeta<A, ArrayMeta<T, A, M>> {
    readonly value: M
    readonly arrayPool: ArrayPool<A>
}

export interface SetMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<Set<T>, SetMeta<T, M>> {
    readonly value: M,
    readonly getIdentity?: (value: T) => any
}

export interface MapMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<Map<string, T>, MapMeta<T, M>> {
    readonly key: PrimitiveMeta<string>
    readonly value: M
}

export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type ExtractType<M> = M extends BaseMeta<infer U, any> ? U : never

export type Modifier<M extends BaseMeta<any, M>> = (metadata: M) => M