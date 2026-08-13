import { JsonOptions } from "../options"
import { ArrayPool } from "../utils/array"
import { IStack } from "../utils/stack"
import { Expand, ReadResult } from "../utils/types"
import { BaseType } from "./baseTypes"

export type TypeName = BaseType | (string & {})

export type JsonReader = {
    readonly raw?: string,
    readonly bytes: Uint8Array
    readonly bytesLength: number,
    readonly writable: boolean,
    sparseIndex?: {
        charIndex: number,
        byteIndex: number
    }
}

export type JsonParsingContext = {
    readonly reader: JsonReader,
    readonly options: JsonOptions,
    readonly stack: IStack<JsonParsingState>
}

export type JsonParsingState = {
    isContinued: boolean,
    [key: string]: any
}

export interface BaseMeta<T> {
    readonly toValue: <M extends this>(metadata: M, context: JsonParsingContext, index: number, depth: number) => ReadResult<T>
    readonly toJson: <M extends this>(metadata: M, value: T, options: JsonOptions) => string
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T> { }

export type Obj = { [k: string]: BaseMeta<any> }
export type AsObject<T extends Obj> = Expand<{ [E in keyof T]: MetaValue<T[E]> }>

export interface ObjectMeta<T extends Obj> extends BaseMeta<AsObject<T>> {
    readonly fields: ObjectField<keyof T & string, T[keyof T]>[]
    readonly build: (values: MetaValue<T[keyof T]>[]) => AsObject<T>
    readonly getFieldIndex: (bytes: Uint8Array, offset: number) => number
}

export type ObjectField<K extends string, M extends BaseMeta<any>> = {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
    readonly value: M
}

export interface NullableMeta<M extends BaseMeta<any>> extends BaseMeta<MetaValue<M> | null> {
    readonly value: M
}

export interface ArrayMeta<A extends ArrayLike<MetaValue<M>>, M extends BaseMeta<any>> extends BaseMeta<A> {
    readonly value: M
    readonly pool: ArrayPool<A>
}

export interface SetMeta<M extends BaseMeta<any>> extends BaseMeta<Set<MetaValue<M>>> {
    readonly value: M,
    readonly key?: (value: MetaValue<M>) => any
}

export interface MapMeta<M extends BaseMeta<any>> extends BaseMeta<Map<string, MetaValue<M>>> {
    readonly key: PrimitiveMeta<string>
    readonly value: M
}

export type MetaValue<M> = M extends BaseMeta<infer U> ? U : never
