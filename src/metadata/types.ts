import { JsonOptions } from "../options"
import { isTypedArray } from "../utils/array"

export type BuiltInType =
    | "string" | "number" | "bigint" | "boolean"
    | "object" | "array" | "date" | "map" | "set"
    | "u8" | "u16" | "u32" | "u64"
    | "i8" | "i16" | "i32" | "i64"
    | "f32" | "f64"

export type TypeName = BuiltInType | (string & {})

export type ConvertResult<T> = {
    readonly value: T
    readonly nextIndex: number
}

export type ConvertCtx = {
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type toValueConverter<T> = (ctx: ConvertCtx, meta: BaseMeta<T>, index: number, depth: number) => ConvertResult<T>
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

export interface CollectionMeta<T, V> extends BaseMeta<T> {
    readonly value: BaseMeta<V>
}

export interface MapMeta<V> extends BaseMeta<Map<string, V>> {
    readonly key: BaseMeta<string>
    readonly value: BaseMeta<V>
}

export type TypeChecker<T = any> = (data: any) => data is T
export type TypeProcessor<T = any, R = BaseMeta<T>> = (data: T) => R

export interface Type<T = any, R = BaseMeta<T>> {
    name: TypeName
    check: TypeChecker<T>
    process: TypeProcessor<T, R>
    priority: number
}

export type UseMetadata = {
    addType: <T, R extends BaseMeta<T>>(type: Type<T, R>) => void
    removeType: (type: string | Type) => Type
    getTypes: () => Type[]
    clearTypes: () => void
    hasType: (name: string) => boolean
    toMetadata: <T>(data: T) => BaseMeta<T>
}

export function useMetadata(): UseMetadata {
    const types = new Map<string, Type>()

    const withDefaultTypes = (metadata: UseMetadata): UseMetadata => {
        metadata.addType<any[], CollectionMeta<any[], any>>({
            name: 'array',
            check: (data): data is any[] => Array.isArray(data),
            process: (data) => {
                const collectionItem = metadata.toMetadata(data[0])
                return {
                    type: 'array',
                    value: collectionItem,
                    toJson: {} as any,
                    toValue: {} as any,
                }
            },
            priority: 50
        })
        metadata.addType<Date, PrimitiveMeta<Date>>({
            name: 'date',
            check: (data): data is Date => data instanceof Date,
            process: (date) => {
                return {
                    type: 'date',
                    toJson: {} as any,
                    toValue: {} as any,
                }
            },
            priority: 51
        })
        metadata.addType<number, PrimitiveMeta<number>>({
            name: 'number',
            check: (data): data is number => typeof data === 'number',
            process: (data) => {
                return {
                    type: 'number',
                    toJson: {} as any,
                    toValue: {} as any,
                }
            },
            priority: 51
        })
        return metadata
    }

    const addType = <T, R extends BaseMeta<T>>(type: Type<T, R>): void => { types.set(type.name, type) }

    const removeType = (type: string | Type): Type => {
        const typeToDelete = typeof type === 'string' ? type : type.name

        const toDelete = types.get(typeToDelete)
        if (!toDelete)
            throw new Error()

        if (!types.delete(typeToDelete))
            throw new Error()

        return toDelete
    }

    const hasType = (name: string): boolean => types.has(name)

    const getTypes = (): Type[] => Array.from(types.values()).sort((a, b) => a.priority - b.priority)

    const clearTypes = (): void => types.clear()

    const toMetadata = <T>(data: T): BaseMeta<T> => {
        const types = getTypes()

        for (const type of types) {
            if (type.check(data))
                return type.process(data)
        }

        throw new Error(`No type handler found for: ${typeof data}`)
    }

    return withDefaultTypes({
        addType,
        removeType,
        getTypes,
        clearTypes,
        hasType,
        toMetadata
    })
}

export function toMeta<T>(data: T): BaseMeta<T> {
    if (data === null || data === undefined)
        throw new Error('fail to detect type of data')

    if (Array.isArray(data)) {

    }

    if (data instanceof Date) {

    }

    if (isTypedArray(data)) {

    }

    if (data instanceof Map) {

    }

    if (data instanceof Set) {

    }

    if (typeof data === "object") {

    }

    return {} as any
}

export function toMeta1<T>(data: T, meta: BaseMeta<any>): BaseMeta<T> {
    return {} as any
}

export function isObjectFieldMeta(obj: unknown): obj is ObjectFieldMeta<any, any> {
    if (!obj || typeof obj !== 'object')
        return false

    const potential = obj as Record<string, unknown>

    const hasToValue = typeof potential.toValue === 'function'
    const hasToJson = typeof potential.toJson === 'function'
    const hasType = typeof potential.type === 'string'

    const hasName = potential.name !== undefined && potential.name !== null && typeof potential.name === 'object'

    if (!hasToValue || !hasToJson || !hasType || !hasName) return false

    const nameObj = potential.name as Record<string, unknown>
    const hasNameValue = 'value' in nameObj
    const hasNameBytes = nameObj.bytes instanceof Uint8Array

    return hasNameValue && hasNameBytes
}
