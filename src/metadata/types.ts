import { JsonOptions } from "../options"
import { ArrayPool } from "../utils/array"
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

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly toValue: (metadata: M, context: ParseContext, index: number, depth: number) => ReadResult<T>
    readonly toJson: (metadata: M, value: T, options: JsonOptions) => string
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export type Obj = { [k: string]: BaseMeta<any, any> }
export type AsObject<T extends Obj> = Expand<{ [E in keyof T]: MetaValue<T[E]> }>

export interface ObjectMeta<T extends Obj> extends BaseMeta<AsObject<T>, ObjectMeta<T>> {
    readonly fields: ObjectFieldMeta<keyof T & string, T[keyof T]>[]
    readonly build: (values: MetaValue<T[keyof T]>[]) => AsObject<T>
    readonly getFieldIndex: (bytes: Uint8Array, offset: number) => number
}

export type ObjectFieldMeta<K extends string, M extends BaseMeta<any, M>> = M & {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
}

export interface NullableMeta<M extends BaseMeta<any, M>> extends BaseMeta<MetaValue<M> | null, NullableMeta<M>> {
    readonly value: M
}

export interface ArrayMeta<A extends ArrayLike<MetaValue<M>>, M extends BaseMeta<any, M>> extends BaseMeta<A, ArrayMeta<A, M>> {
    readonly value: M
    readonly pool: ArrayPool<A>
}

export interface SetMeta<M extends BaseMeta<any, M>> extends BaseMeta<Set<MetaValue<M>>, SetMeta<M>> {
    readonly value: M,
    readonly key?: (value: MetaValue<M>) => any
}

export interface MapMeta<M extends BaseMeta<any, M>> extends BaseMeta<Map<string, MetaValue<M>>, MapMeta<M>> {
    readonly key: PrimitiveMeta<string>
    readonly value: M
}

export type MetaValue<M> = M extends BaseMeta<infer U, any> ? U : never
