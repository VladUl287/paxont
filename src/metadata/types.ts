import { JsonOptions } from "../options"

export type BuiltInType =
    | "string" | "number" | "bigint" | "boolean" | "symbol"
    | "object" | "array" | "date" | "map" | "set"
    | "u8" | "u16" | "u32" | "u64"
    | "i8" | "i16" | "i32" | "i64"
    | "f32" | "f64"

export type TypeName = BuiltInType | (string & {})

export type ConvertCtx = {
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type toValueConverter<T> = (ctx: ConvertCtx, meta: BaseMeta<T>, index: number, depth: number) => T
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
        value: K
        bytes: Uint8Array
    }
}

export interface CollectionMeta<T> extends BaseMeta<T> {
    readonly value: BaseMeta<unknown>
}

export function toMeta<T>(data: T): BaseMeta<T> {
    return {} as any
}

export function toMeta1<T>(data: T, meta: BaseMeta<any>): BaseMeta<T> {
    return {} as any
}