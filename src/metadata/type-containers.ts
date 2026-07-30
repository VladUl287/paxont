import { BigIntTypedArray, FloatTypedArray, IntegerTypedArray } from "../utils/array"

export declare const UNWRAP: unique symbol

type Unwrappable<U> = { readonly [UNWRAP]: U }

export type Unwrap<T> =
    T extends Unwrappable<infer U> ? Unwrap<U> :
    T extends Date ? T :
    T extends IntegerTypedArray | FloatTypedArray | BigIntTypedArray ? T :
    T extends (infer U)[] ? Unwrap<U>[] :
    T extends Set<infer U> ? Set<Unwrap<U>> :
    T extends Map<infer K, infer V> ? Map<Unwrap<K>, Unwrap<V>> :
    T extends Record<string, any> ? { [K in keyof T]: Unwrap<T[K]> } :
    T

export class Nullable<T> {
    constructor(private readonly _value: T) { }

    public get value() {
        return this._value
    }

    readonly [UNWRAP]: T | null = this.value
}

export class Int8 {
    readonly [UNWRAP]: number = 127
}
export class Int16 {
    readonly [UNWRAP]: number = 32_767
}
export class Int32 {
    readonly [UNWRAP]: number = 2_147_483_647
}
export class Int64 {
    readonly [UNWRAP]: bigint = 9_223_372_036_854_775_807n
}
export class Uint8 {
    readonly [UNWRAP]: number = 255
}
export class Uint16 {
    readonly [UNWRAP]: number = 65_535
}
export class Uint32 {
    readonly [UNWRAP]: number = 4_294_967_295
}
export class Uint64 {
    readonly [UNWRAP]: bigint = 18_446_744_073_709_551_615n
}