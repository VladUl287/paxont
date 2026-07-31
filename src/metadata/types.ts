import { JsonOptions } from "../options"
import { ArrPool } from "../utils/array"
import { IStack } from "../utils/stack"
import { Expand, ReadResult } from "../utils/types"
import { BaseType } from "./baseTypes"

export type TypeName = BaseType | (string & {})

export type JsonReader = {
    readonly bytes: Uint8Array
    readonly writable: boolean
}

export type ParseContext = {
    readonly reader: JsonReader,
    readonly options: JsonOptions,
    readonly stack: IStack<ParseState>
}

export type ParseState = {
    isContinued: boolean,
    [key: string]: any
}

export const JSONTMetaTag: unique symbol = Symbol("JSONTMetaTag")

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly [JSONTMetaTag]: true
    readonly toValue: (metadata: M, context: ParseContext, index: number, depth: number) => ReadResult<T>
    readonly toJson: (metadata: M, value: T, options: JsonOptions) => string
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export type Obj = { [k: string]: BaseMeta<any, any> }
export type AsObject<T extends Obj> = Expand<{ [E in keyof T]: MetaValue<T[E]> }>

type AsValuesArray<T extends Obj> = Expand<MetaValue<T[keyof T]>[]>
type AsFieldsArray<T extends Obj> = Expand<ObjectField<keyof T & string, T[keyof T]>[]>

export interface ObjectMeta<T extends Obj> extends BaseMeta<AsObject<T>, ObjectMeta<T>> {
    readonly fields: AsFieldsArray<T>
    readonly build: (values: AsValuesArray<T>) => AsObject<T>
    readonly getFieldIndex: (bytes: Uint8Array, offset: number) => number
}

export type ObjectField<K extends string, M extends BaseMeta<any, M>> = {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
    readonly value: M
}

export interface NullableMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<T | null, NullableMeta<T, M>> {
    readonly value: M
}

export interface ArrayMeta<T, A extends ArrayLike<T>, M extends BaseMeta<T, M>> extends BaseMeta<A, ArrayMeta<T, A, M>> {
    readonly value: M
    readonly pool: ArrPool<A>
}

export interface SetMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<Set<T>, SetMeta<T, M>> {
    readonly value: M,
    readonly getIdentity?: (value: T) => any
}

export interface MapMeta<T, M extends BaseMeta<T, M>> extends BaseMeta<Map<string, T>, MapMeta<T, M>> {
    readonly key: PrimitiveMeta<string>
    readonly value: M
}

export type MetaValue<M> = M extends BaseMeta<infer U, any> ? U : never
