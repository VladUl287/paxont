import { JsonOptions } from "../options"
import { ArrayPool } from "../utils/array"
import { Stack } from "../utils/stack"
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
    readonly stack: Stack<ParseState>
}

export type ParseState = {
    isContinued: boolean,
    [key: string]: any
}

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly toValue: (metadata: M, context: ParseContext, index: number, depth: number) => ReadResult<T>
    readonly toJson: (metadata: M, value: T, options: JsonOptions) => string
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export interface ObjectMeta<M extends Record<string, BaseMeta<any, any>>>
    extends BaseMeta<ObjectFromMeta<M>, ObjectMeta<M>> {
    readonly fields: ObjectFields<M>
    readonly build: (values: ObjectFieldsValues<M>) => ObjectFromMeta<M>
    readonly getFieldIndex: (bytes: Uint8Array, offset: number) => number
}

export type ObjectFieldMeta<K extends string, M extends BaseMeta<any, M>> = {
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
    [K in keyof Keys]: ObjectFieldMeta<Keys[K] & string, T[Keys[K] & keyof T]>
}

export type ObjectFromMeta<T extends Record<string, BaseMeta<any, any>>> =
    Expand<{ [E in keyof T]: ExtractType<T[E]> }>

export interface NullableMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<T | null, NullableMeta<T, M>> {
    readonly value: M
}

export interface ArrayMeta<T, A extends ArrayLike<T>, M extends BaseMeta<T, M>> extends BaseMeta<A, ArrayMeta<T, A, M>> {
    readonly value: M
    readonly pool: ArrayPool<A>
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