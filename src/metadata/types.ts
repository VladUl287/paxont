import { JsonOptions } from "../options"
import { isPlainObject } from "../utils/object"
import { Int16, Int32, Int64, Int8, Nullable, ReadResult, Uint16, Uint32, Uint64, Uint8 } from "../utils/types"
import * as Base from "./baseTypes"
import { array, bigInt, bool, date, ExtractType, field, i16, i16Array, i32, i32Array, i64, i64Array, i8, i8Array, map, nullable, number, object, set, string, u16, u16Array, u32, u32Array, u64, u64Array, u8, u8Array } from "./builder"

export type TypeName = Base.BaseTypes | (string & {})

export type ConvertCtx = {
    readonly raw?: string,
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type toValueConverter<T, M extends BaseMeta<T, M>> =
    (ctx: ConvertCtx, meta: M, index: number, depth: number) => ReadResult<T>

export type toJsonConverter<T, M extends BaseMeta<T, M>> = (value: T, meta: M) => string

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly toValue: toValueConverter<T, M>,
    readonly toJson: toJsonConverter<T, M>,
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export interface ObjectMeta<T> extends BaseMeta<T, ObjectMeta<T>> {
    readonly fields: ObjectFields<T>
    readonly factory: (values: T[keyof T][]) => T
    readonly fieldIndexResolver: (field: Uint8Array, index: number) => number
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

export type checkType<T = any> = (data: unknown) => data is T
export type toMeta<T, M extends BaseMeta<T, any>> = (data: T) => M

export interface JType<M extends BaseMeta<any, any> = BaseMeta<any, any>> {
    type: TypeName,
    check: checkType<ExtractType<M>>
    toMeta: toMeta<ExtractType<M>, M>
    priority: number
}

export type UseMetadata = {
    addType: <M extends BaseMeta<any, any>>(type: JType<M>) => void
    deleteType: (type: string | JType) => boolean
    getTypes: () => JType[]
    clearTypes: () => void
    hasType: (name: string) => boolean
    toMetadata: <T>(data: T) => BaseMeta<T, any>
}

export function useMetadata(): UseMetadata {
    const types = new Map<TypeName, JType>()

    const withDefaultTypes = (meta: UseMetadata): UseMetadata => {
        const types: JType<BaseMeta<any, any>>[] = [
            { type: Base.JSONT_STRING, check: (d) => typeof d === 'string', toMeta: string, priority: 50 },
            { type: Base.JSONT_NUMBER, check: (d) => typeof d === 'number', toMeta: number, priority: 50 },
            { type: Base.JSONT_BIGINT, check: (d) => typeof d === 'bigint', toMeta: bigInt, priority: 50 },
            { type: Base.JSONT_BOOL, check: (d) => typeof d === 'boolean', toMeta: bool, priority: 50 },
            { type: Base.JSONT_DATE, check: (d) => d instanceof Date, toMeta: date, priority: 50 },
            { type: Base.JSONT_ARRAY, check: (d) => Array.isArray(d), toMeta: (v) => array(meta.toMetadata(v)), priority: 50 },
            { type: Base.JSONT_SET, check: (d) => d instanceof Set, toMeta: (v) => set(meta.toMetadata(v)), priority: 50 },
            { type: Base.JSONT_MAP, check: (d) => d instanceof Map, toMeta: (v) => map(meta.toMetadata(v)), priority: 50 },
            { type: Base.JSONT_NULLABLE, check: (d) => d instanceof Nullable, toMeta: (v) => nullable(meta.toMetadata(v)), priority: 50 },
            { type: Base.JSONT_I8, check: (d) => d instanceof Int8, toMeta: i8, priority: 50 },
            { type: Base.JSONT_I16, check: (d) => d instanceof Int16, toMeta: i16, priority: 50 },
            { type: Base.JSONT_I32, check: (d) => d instanceof Int32, toMeta: i32, priority: 50 },
            { type: Base.JSONT_I64, check: (d) => d instanceof Int64, toMeta: i64, priority: 50 },
            { type: Base.JSONT_U8, check: (d) => d instanceof Uint8, toMeta: u8, priority: 50 },
            { type: Base.JSONT_U16, check: (d) => d instanceof Uint16, toMeta: u16, priority: 50 },
            { type: Base.JSONT_U32, check: (d) => d instanceof Uint32, toMeta: u32, priority: 50 },
            { type: Base.JSONT_U64, check: (d) => d instanceof Uint64, toMeta: u64, priority: 50 },
            { type: Base.JSONT_I8_ARRAY, check: (d) => d instanceof Int8Array, toMeta: i8Array, priority: 50 },
            { type: Base.JSONT_I16_ARRAY, check: (d) => d instanceof Int16Array, toMeta: i16Array, priority: 50 },
            { type: Base.JSONT_I32_ARRAY, check: (d) => d instanceof Int32Array, toMeta: i32Array, priority: 50 },
            { type: Base.JSONT_I64_ARRAY, check: (d) => d instanceof BigInt64Array, toMeta: i64Array, priority: 50 },
            { type: Base.JSONT_U8_ARRAY, check: (d) => d instanceof Uint8Array, toMeta: u8Array, priority: 50 },
            { type: Base.JSONT_U16_ARRAY, check: (d) => d instanceof Uint16Array, toMeta: u16Array, priority: 50 },
            { type: Base.JSONT_U32_ARRAY, check: (d) => d instanceof Uint32Array, toMeta: u32Array, priority: 50 },
            { type: Base.JSONT_U64_ARRAY, check: (d) => d instanceof BigUint64Array, toMeta: u64Array, priority: 50 },
            {
                type: Base.JSONT_OBJECT,
                check: (d): d is object => isPlainObject(d),
                toMeta: (d) => object(...Object.entries(d).map((c) => field(c[0], meta.toMetadata(c[1])))),
                priority: 100
            }
        ]
        types.forEach(t => meta.addType(t))
        return meta
    }

    const addType = <M extends BaseMeta<any, any>>(jtype: JType<M>): void => {
        types.set(jtype.type, jtype)
    }

    const deleteType = (jtype: string | JType): boolean => {
        const type = typeof jtype === 'string' ? jtype : jtype.type
        return types.delete(type)
    }

    const hasType = (name: string): boolean => types.has(name)

    const getTypes = (): JType[] => [...types.values()].sort((a, b) => a.priority - b.priority)

    const clearTypes = (): void => types.clear()

    const toMetadata = <T>(data: T): BaseMeta<T, any> => {
        const types = getTypes()

        for (const type of types) {
            if (type.check(data))
                return type.toMeta(data)
        }

        throw new Error(``)
    }

    return withDefaultTypes({
        addType,
        deleteType,
        hasType,
        getTypes,
        clearTypes,
        toMetadata,
    })
}

// export function toMeta<T>(data: T): BaseMeta<T> {
//     if (data === null || data === undefined)
//         throw new Error('fail to detect type of data')

//     if (Array.isArray(data)) {

//     }

//     if (data instanceof Date) {

//     }

//     if (isTypedArray(data)) {

//     }

//     if (data instanceof Map) {

//     }

//     if (data instanceof Set) {

//     }

//     if (typeof data === "object") {

//     }

//     return {} as any
// }

// export function toMeta1<T>(data: T, meta: BaseMeta<any>): BaseMeta<T> {
//     return {} as any
// }

// export function isObjectFieldMeta(obj: unknown): obj is ObjectFieldMeta<any, any> {
//     if (!obj || typeof obj !== 'object')
//         return false

//     const potential = obj as Record<string, unknown>

//     const hasToValue = typeof potential.toValue === 'function'
//     const hasToJson = typeof potential.toJson === 'function'
//     const hasType = typeof potential.type === 'string'

//     const hasName = potential.name !== undefined && potential.name !== null && typeof potential.name === 'object'

//     if (!hasToValue || !hasToJson || !hasType || !hasName) return false

//     const nameObj = potential.name as Record<string, unknown>
//     const hasNameValue = 'value' in nameObj
//     const hasNameBytes = nameObj.bytes instanceof Uint8Array

//     return hasNameValue && hasNameBytes
// }


export function isMeta(value: unknown): value is BaseMeta<any, any> {
    if (!value || typeof value !== 'object')
        return false

    const potential = value as Record<string, unknown>

    const hasToValue = typeof potential.toValue === 'function'
    const hasToJson = typeof potential.toJson === 'function'
    const hasType = typeof potential.type === 'string'

    return hasToValue && hasToJson && hasType
}
