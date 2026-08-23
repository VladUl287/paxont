import { JsonOptions } from "../options"
import { ArrayPool } from "../utils/array"
import { JsonReader } from "../utils/reader"
import { IStack } from "../utils/stack"
import { ReadResult } from "../utils/result"
import { BaseType } from "./baseTypes"
import { Expand } from "../utils/types"

export type TypeName = BaseType | (string & {})

export class JsonParsingContext {
    constructor(
        public readonly reader: JsonReader,
        public readonly options: JsonOptions,
        public readonly stack: IStack<JsonParsingState>,
        public depth: number = 0
    ) { }

    public setDepth(depth: number) {
        this.depth = depth
    }
}

export type JsonParsingState = {
    isContinued: boolean,
    [key: string]: any
}

export interface BaseMeta<T> {
    readonly toValue: <M extends this>(metadata: M, context: JsonParsingContext) => ReadResult<T>
    readonly toJson: <M extends this>(metadata: M, value: T, options: JsonOptions) => string
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T> { }

export type AsObject<T extends Record<string, BaseMeta<any>>> = Expand<{ [E in keyof T]: MetaValue<T[E]> }>

export interface ObjectMeta<T extends Record<string, BaseMeta<any>>> extends BaseMeta<AsObject<T>> {
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
