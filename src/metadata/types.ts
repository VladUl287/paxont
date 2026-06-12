import { Converter } from "../converters/types"

export type BuiltInType =
    | "string" | "number" | "bigint" | "boolean" | "symbol"
    | "object" | "array" | "date" | "map" | "set"
    | "u8" | "u16" | "u32" | "u64"
    | "i8" | "i16" | "i32" | "i64"
    | "f32" | "f64"

export type TypeName = BuiltInType | (string & {})

export type toValueConverter<T> = (ctx: any, meta: any, index: number, depth: number) => T
export type toJsonConverter<T> = (value: T) => string

export interface BaseMeta<T> {
    readonly toValue: toValueConverter<T>,
    readonly toJson: toJsonConverter<T>,
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T> { }

export interface ObjectMeta<T> extends BaseMeta<T> {
    readonly fields: {
        [K in keyof T]: ObjectFieldMeta<T, K>
    }[keyof T][]
    readonly factory: (values: T[keyof T][]) => T
    readonly fieldIndexResolver: (field: Uint8Array, index: number) => number
}

export type ObjectFieldMeta<T, K extends keyof T> = BaseMeta<T[K]> & WithName<K>

export type WithName<K> = {
    readonly name: {
        value: K;
        bytes: Uint8Array
    }
}

export interface CollectionMeta<T> extends BaseMeta<T> {
    readonly value: BaseMeta<unknown>
}

const test = {} as ObjectMeta<{ id: number, name: string }>

export function toMeta<T>(data: T): BaseMeta<T> {
    return {} as any
}

export function toMeta1<T>(data: T, meta: BaseMeta<any>): BaseMeta<T> {
    return {} as any
}

export type Metadata = MetaPrimitive | MetaObject | MetaArray

export type MetaObject = {
    readonly fields: MetaObjectField[]
    readonly factory: (props: unknown[]) => object
    readonly getFieldIndex: (field: Uint8Array, index: number) => number
}

export type MetaPrimitive = {
    readonly type: TypeName
}

export type MetaObjectField = MetaPrimitive & {
    readonly name: {
        value: string,
        bytes: Uint8Array<ArrayBuffer>
        equal: (bytes: Uint8Array, i: number) => boolean
    }
    readonly value: Metadata
}

export type MetaArray = {
    readonly type: TypeName
    readonly value: Metadata
}

export const isMetaObjectField = (meta: Metadata): meta is MetaObjectField =>
    meta !== null &&
    typeof meta === 'object' &&
    'type' in meta &&
    'name' in meta &&
    'value' in meta &&
    !('fields' in meta) &&
    !('factory' in meta)

export const isMetaObject = (meta: Metadata): meta is MetaObject =>
    meta !== null &&
    typeof meta === 'object' &&
    'fields' in meta &&
    'factory' in meta &&
    'getFieldIndex' in meta &&
    !('name' in meta)

export const isMetaArray = (meta: Metadata): meta is MetaArray =>
    meta !== null &&
    typeof meta === 'object' &&
    'type' in meta &&
    'value' in meta &&
    !('name' in meta) &&
    !('fields' in meta);