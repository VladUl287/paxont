import {
    ARRAY, BIGINT, BOOL, DATE, F64_ARRAY, I16_ARRAY, I32_ARRAY,
    I64_ARRAY, I8_ARRAY, MAP, NUMBER, OBJECT, SET, STRING,
    U16_ARRAY, U32_ARRAY, U64_ARRAY, U8_ARRAY
} from "./baseTypes"
import { BaseMeta, MetaValue, TypeName } from "./types"
import {
    array, bigInt, bool, date, f64Array, i16Array, i32Array,
    i64Array, i8Array, map, number, object, set, string,
    u16Array, u32Array, u64Array, u8Array
} from "./builder"
import { isPlainObject } from "../utils/object"
import { isMeta } from "./utils"

type HasMeta<T> =
    T extends BaseMeta<any> ? true :
    T extends Function ? false :
    T extends object ? true extends { [K in keyof T]: HasMeta<T[K]> }[keyof T] ? true : false
    : false

export type Unwrap<T> =
    T extends BaseMeta<any> ? MetaValue<T> :
    T extends (infer U)[] ? Unwrap<U>[] :
    T extends Set<infer U> ? Set<Unwrap<U>> :
    T extends Map<string, infer V> ? Map<string, Unwrap<V>> :
    HasMeta<T> extends true ? { [K in keyof T]: Unwrap<T[K]> } :
    T

export type Metadata = {
    readonly add: <M extends BaseMeta<any>>(type: JType<M>) => void
    readonly addMany: (...types: JType<BaseMeta<any>>[]) => void
    readonly remove: (type: TypeName | JType<any>) => boolean
    readonly clear: () => void
    readonly from: <T, R extends BaseMeta<any> = BaseMeta<Unwrap<T>>>(data: T) => R
}

export type MetadataOptions = {
    readonly withDefaults: (m: Metadata) => Metadata
}

export type JType<M extends BaseMeta<any>> = {
    readonly name: TypeName,
    readonly is: (input: any) => boolean
    readonly from: (input: any, metadata: Metadata) => M
    readonly order: number
}

const defaultOptions: MetadataOptions = { withDefaults }

export function metadata(options: Partial<MetadataOptions> = defaultOptions): Metadata {
    const { withDefaults } = {
        ...defaultOptions,
        ...options
    }

    let jTypes = new Array<JType<any>>()

    const add = <M extends BaseMeta<any>>(type: JType<M>): void => {
        jTypes.push(type)
        jTypes.sort((a, b) => a.order - b.order)
    }

    const addMany = (...types: JType<BaseMeta<any>>[]): void => {
        jTypes.push(...types)
        jTypes.sort((a, b) => a.order - b.order)
    }

    const remove = (type: TypeName | JType<any>): boolean => {
        const predicate: (value: JType<any>) => boolean = typeof type === 'string' ?
            t => t.name !== type :
            t => t !== type

        const filtered = jTypes.filter(predicate)
        const found = filtered.length !== jTypes.length
        jTypes = filtered
        return found
    }

    const clear = (): void => { jTypes = [] }

    const from = <T, R extends BaseMeta<any> = BaseMeta<Unwrap<T>>>(data: T): R => {
        for (const type of jTypes) {
            if (type.is(data)) {
                return type.from(data, instance)
            }
        }
        throw new Error(`Cannot create metadata for value of type ${typeof data}: ${JSON.stringify(data)}.`)
    }

    const instance = { add, addMany, remove, clear, from }
    return withDefaults(instance)
}

export function withDefaults(meta: Metadata): Metadata {
    meta.addMany(
        { name: 'metadata', is: isMeta, from: (m) => m, order: 50 },
        { name: STRING, is: (v) => typeof v === 'string', from: () => string(), order: 50 },
        { name: NUMBER, is: (v) => typeof v === 'number', from: () => number(), order: 50 },
        { name: BIGINT, is: (v) => typeof v === 'bigint', from: () => bigInt(), order: 50 },
        { name: BOOL, is: (v) => typeof v === 'boolean', from: () => bool(), order: 50 },
        { name: DATE, is: (v) => v instanceof Date, from: () => date(), order: 50 },
        { name: I8_ARRAY, is: (v) => v instanceof Int8Array, from: () => i8Array(), order: 50 },
        { name: I16_ARRAY, is: (v) => v instanceof Int16Array, from: () => i16Array(), order: 50 },
        { name: I32_ARRAY, is: (v) => v instanceof Int32Array, from: () => i32Array(), order: 50 },
        { name: I64_ARRAY, is: (v) => v instanceof BigInt64Array, from: () => i64Array(), order: 50 },
        { name: U8_ARRAY, is: (v) => v instanceof Uint8Array, from: () => u8Array(), order: 50 },
        { name: U16_ARRAY, is: (v) => v instanceof Uint16Array, from: () => u16Array(), order: 50 },
        { name: U32_ARRAY, is: (v) => v instanceof Uint32Array, from: () => u32Array(), order: 50 },
        { name: U64_ARRAY, is: (v) => v instanceof BigUint64Array, from: () => u64Array(), order: 50 },
        { name: F64_ARRAY, is: (v) => v instanceof Float64Array, from: () => f64Array(), order: 50 },
        { name: ARRAY, is: (v) => Array.isArray(v), from: (a, m) => array(m.from(a[0])), order: 50 },
        { name: SET, is: (v) => v instanceof Set, from: (s, m) => set(m.from([...s.values()][0])), order: 50 },
        { name: MAP, is: (v) => v instanceof Map, from: (ma, m) => map(m.from([...ma.values()][0])), order: 50 },
        {
            name: OBJECT,
            is: (v) => isPlainObject(v) && !isMeta(v),
            from: (o, m) => {
                const structure = Object.entries(o).reduce((acc, [key, value]) => {
                    acc[key] = m.from(value)
                    return acc
                }, <Record<string, BaseMeta<any>>>{})
                return object(structure)
            },
            order: 50
        })
    return meta
}
