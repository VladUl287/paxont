import { JsonOptions } from "../options"
import { ReadResult } from "../utils/types"

export const JSON_TYPE_STRING = 'string'
export const JSON_TYPE_NUMBER = 'number'
export const JSON_TYPE_BIGINT = 'bigint'
export const JSON_TYPE_BOOL = 'boolean'
export const JSON_TYPE_OBJECT = 'object'
export const JSON_TYPE_ARRAY = 'array'
export const JSON_TYPE_DATE = 'date'
export const JSON_TYPE_MAP = 'map'
export const JSON_TYPE_SET = 'set'

export const JSON_TYPE_U8 = 'u8'
export const JSON_TYPE_U16 = 'u16'
export const JSON_TYPE_U32 = 'u32'
export const JSON_TYPE_U64 = 'u64'
export const JSON_TYPE_I8 = 'i8'
export const JSON_TYPE_I16 = 'i16'
export const JSON_TYPE_I32 = 'i32'
export const JSON_TYPE_I64 = 'i64'
export const JSON_TYPE_F32 = 'f32'

export const JSON_TYPE_U8_ARRAY = 'u8[]'
export const JSON_TYPE_U16_ARRAY = 'u16[]'
export const JSON_TYPE_U32_ARRAY = 'u32[]'
export const JSON_TYPE_U64_ARRAY = 'u64[]'
export const JSON_TYPE_I8_ARRAY = 'i8[]'
export const JSON_TYPE_I16_ARRAY = 'i16[]'
export const JSON_TYPE_I32_ARRAY = 'i32[]'
export const JSON_TYPE_I64_ARRAY = 'i64[]'
export const JSON_TYPE_F32_ARRAY = 'f32[]'
export const JSON_TYPE_F64_ARRAY = 'f64[]'

export type BuiltInType =
    | typeof JSON_TYPE_STRING | typeof JSON_TYPE_BIGINT | typeof JSON_TYPE_BOOL | typeof JSON_TYPE_OBJECT
    | typeof JSON_TYPE_ARRAY | typeof JSON_TYPE_DATE | typeof JSON_TYPE_MAP | typeof JSON_TYPE_SET
    | typeof JSON_TYPE_U8 | typeof JSON_TYPE_U16 | typeof JSON_TYPE_U32 | typeof JSON_TYPE_U64
    | typeof JSON_TYPE_I8 | typeof JSON_TYPE_I16 | typeof JSON_TYPE_I32 | typeof JSON_TYPE_I64
    | typeof JSON_TYPE_F32 | typeof JSON_TYPE_NUMBER
    | typeof JSON_TYPE_U8_ARRAY | typeof JSON_TYPE_U16_ARRAY | typeof JSON_TYPE_U32_ARRAY | typeof JSON_TYPE_U64_ARRAY
    | typeof JSON_TYPE_I8_ARRAY | typeof JSON_TYPE_I16_ARRAY | typeof JSON_TYPE_I32_ARRAY | typeof JSON_TYPE_I64_ARRAY
    | typeof JSON_TYPE_F32_ARRAY | typeof JSON_TYPE_F64_ARRAY

export type TypeName = BuiltInType | (string & {})

export type ConvertCtx = {
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type toValueConverter<T, M extends BaseMeta<T, M>> =
    (ctx: ConvertCtx, meta: M, index: number, depth: number) => ReadResult<T>

export type toJsonConverter<T> = (value: T, meta: BaseMeta<T, any>) => string

export interface BaseMeta<T, M extends BaseMeta<T, M>> {
    readonly toValue: toValueConverter<T, M>,
    readonly toJson: toJsonConverter<T>,
    readonly type: TypeName
}

export interface PrimitiveMeta<T> extends BaseMeta<T, PrimitiveMeta<T>> { }

export interface ObjectMeta<T> extends BaseMeta<T, ObjectMeta<T>> {
    readonly fields: ObjectFields<T>
    readonly factory: (values: T[keyof T][]) => T
    readonly fieldIndexResolver: (field: Uint8Array, index: number) => number
}

export type ObjectFields<T> = {
    [K in keyof T]: ObjectFieldMeta<T[K], K>
}[keyof T][]

export type ObjectFieldMeta<K, T> = BaseMeta<T, ObjectFieldMeta<K, T>> & {
    readonly name: {
        value: K
        bytes: Uint8Array
    }
}

export interface CollectionMeta<T, V> extends BaseMeta<T, CollectionMeta<T, V>> {
    readonly value: BaseMeta<V, any>
}

export interface MapMeta<V> extends BaseMeta<Map<string, V>, MapMeta<V>> {
    readonly key: BaseMeta<string, any>
    readonly value: BaseMeta<V, any>
}

// export type TypeChecker<T = any> = (data: any) => data is T
// export type TypeProcessor<T = any, R = BaseMeta<T, any>> = (data: T) => R

// export interface Type<T = any, R = BaseMeta<T, any>> {
//     name: TypeName
//     check: TypeChecker<T>
//     process: TypeProcessor<T, R>
//     priority: number
// }

// export type UseMetadata = {
//     addType: <T, R extends BaseMeta<T, any>>(type: Type<T, R>) => void
//     removeType: (type: string | Type) => Type
//     getTypes: () => Type[]
//     clearTypes: () => void
//     hasType: (name: string) => boolean
//     toMetadata: <T>(data: T) => BaseMeta<T, any>
// }

// export function useMetadata(): UseMetadata {
//     const types = new Map<string, Type>()

//     const withDefaultTypes = (metadata: UseMetadata): UseMetadata => {
//         metadata.addType<object, ObjectMeta<object>>({
//             name: 'object',
//             check: (data): data is object => isPlainObject(data),
//             process: (data) => ({} as any),
//             priority: 50
//         })
//         metadata.addType<any[], CollectionMeta<any[], any>>({
//             name: 'array',
//             check: (data): data is any[] => Array.isArray(data),
//             process: (data) => {
//                 const collectionItem = metadata.toMetadata(data[0])
//                 return {
//                     type: 'array',
//                     value: collectionItem,
//                     toJson: {} as any,
//                     toValue: {} as any,
//                 }
//             },
//             priority: 50
//         })
//         metadata.addType<Date, BaseMeta<Date>>({
//             name: 'date',
//             check: (data): data is Date => data instanceof Date,
//             process: (date) => {
//                 return {
//                     type: 'date',
//                     toJson: {} as any,
//                     toValue: {} as any,
//                 }
//             },
//             priority: 51
//         })
//         metadata.addType<number, BaseMeta<number>>({
//             name: 'number',
//             check: (data): data is number => typeof data === 'number',
//             process: (data) => {
//                 return {
//                     type: 'number',
//                     toJson: {} as any,
//                     toValue: {} as any,
//                 }
//             },
//             priority: 51
//         })
//         return metadata
//     }

//     const addType = <T, R extends BaseMeta<T>>(type: Type<T, R>): void => { types.set(type.name, type) }

//     const removeType = (type: string | Type): Type => {
//         const typeToDelete = typeof type === 'string' ? type : type.name

//         const toDelete = types.get(typeToDelete)
//         if (!toDelete)
//             throw new Error()

//         if (!types.delete(typeToDelete))
//             throw new Error()

//         return toDelete
//     }

//     const hasType = (name: string): boolean => types.has(name)

//     const getTypes = (): Type[] => Array.from(types.values()).sort((a, b) => a.priority - b.priority)

//     const clearTypes = (): void => types.clear()

//     const toMetadata = <T>(data: T): BaseMeta<T> => {
//         const types = getTypes()

//         for (const type of types) {
//             if (type.check(data))
//                 return type.process(data)
//         }

//         throw new Error(`No type handler found for: ${typeof data}`)
//     }

//     return withDefaultTypes({
//         addType,
//         removeType,
//         getTypes,
//         clearTypes,
//         hasType,
//         toMetadata
//     })
// }

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
