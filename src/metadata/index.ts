import {
    ARRAY, BIGINT, BOOL, DATE, F64_ARRAY, I16, I16_ARRAY, I32, I32_ARRAY,
    I64, I64_ARRAY, I8, I8_ARRAY, MAP, NULLABLE, NUMBER, OBJECT, SET, STRING,
    U16, U16_ARRAY, U32, U32_ARRAY, U64, U64_ARRAY, U8, U8_ARRAY
} from "./baseTypes"
import { ArrayMeta, BaseMeta, MapMeta, MetaValue, NullableMeta, ObjectMeta, PrimitiveMeta, SetMeta, TypeName } from "./types"
import {
    array, bigInt, bool, date, f64Array, i16Array, i32Array,
    i64Array, i8Array, map, number, object, set, string,
    u16Array, u32Array, u64Array, u8Array
} from "./builder"
import { isPlainObject } from "../utils/object"
import { isMetadata, isMetadataContainer } from "./utils"
import { field } from "./modifiers"

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

    const jTypes = new Array<JType<any>>()

    const add = <M extends BaseMeta<any>>(type: JType<M>): void => {
        jTypes.push(type)
        jTypes.sort((a, b) => a.order - b.order)
    }

    const remove = (type: TypeName | JType<any>): boolean => {
        const isStringType = typeof type === 'string' ? type : type.name

        let count = 0
        jTypes.sort((a, _) => {
            const result = a.name === isStringType ? 1 : 0
            count += result
            return result
        })
        jTypes.splice(jTypes.length - count, count)
        return count > 0
    }

    const clear = (): void => { jTypes.splice(0) }

    const from = <T, R extends BaseMeta<any> = BaseMeta<Unwrap<T>>>(data: T): R => {
        for (const type of jTypes) {
            if (type.is(data)) {
                return type.from(data, instance)
            }
        }
        throw new Error(`Cannot create metadata for value of type ${typeof data}: ${JSON.stringify(data)}.`)
    }

    const instance = { add, remove, clear, from }
    return withDefaults(instance)
}

export function withDefaults(m: Metadata): Metadata {
    function withNative(m: Metadata): Metadata {
        m.add({ name: STRING, is: (v) => typeof v === 'string', from: () => string(), order: 50 })
        m.add({ name: NUMBER, is: (v) => typeof v === 'number', from: () => number(), order: 50 })
        m.add({ name: BIGINT, is: (v) => typeof v === 'bigint', from: () => bigInt(), order: 50 })
        m.add({ name: BOOL, is: (v) => typeof v === 'boolean', from: () => bool(), order: 50 })
        m.add({ name: DATE, is: (v) => v instanceof Date, from: () => date(), order: 50 })

        m.add({ name: I8_ARRAY, is: (v) => v instanceof Int8Array, from: () => i8Array(), order: 50 })
        m.add({ name: I16_ARRAY, is: (v) => v instanceof Int16Array, from: () => i16Array(), order: 50 })
        m.add({ name: I32_ARRAY, is: (v) => v instanceof Int32Array, from: () => i32Array(), order: 50 })
        m.add({ name: I64_ARRAY, is: (v) => v instanceof BigInt64Array, from: () => i64Array(), order: 50 })
        m.add({ name: U8_ARRAY, is: (v) => v instanceof Uint8Array, from: () => u8Array(), order: 50 })
        m.add({ name: U16_ARRAY, is: (v) => v instanceof Uint16Array, from: () => u16Array(), order: 50 })
        m.add({ name: U32_ARRAY, is: (v) => v instanceof Uint32Array, from: () => u32Array(), order: 50 })
        m.add({ name: U64_ARRAY, is: (v) => v instanceof BigUint64Array, from: () => u64Array(), order: 50 })
        m.add({ name: F64_ARRAY, is: (v) => v instanceof Float64Array, from: () => f64Array(), order: 50 })

        m.add({ name: ARRAY, is: (v) => Array.isArray(v), from: (a, m) => array(m.from(a[0])), order: 50 })
        m.add({ name: SET, is: (v) => v instanceof Set, from: (s, m) => set(m.from([...s.values()][0])), order: 50 })
        m.add({ name: MAP, is: (v) => v instanceof Map, from: (ma, m) => map(m.from([...ma.values()][0])), order: 50 })

        m.add({
            name: OBJECT,
            is: (v): v is {} => isPlainObject(v) && !isMetadata(v),
            from: (o, m) => {
                const fields = Object.entries(o).map(([key, value]) => field(key, m.from(value)))
                return object(...fields)
            },
            order: 50
        })
        return m
    }

    function withMetadata(m: Metadata): Metadata {
        const isType = <M extends BaseMeta<any> = BaseMeta<any>>(type: TypeName): JType<M>['is'] =>
            (v: any): boolean => isMetadata(v) && v.type === type
        const createFor = <M extends BaseMeta<any> = BaseMeta<any>>(type: TypeName, is: (v: any) => boolean = isType(type)): JType<M> =>
            ({ name: type, is, from: (m) => m, order: 50 })

        m.add(createFor(STRING))
        m.add(createFor(NUMBER))
        m.add(createFor(BIGINT))
        m.add(createFor(BOOL))
        m.add(createFor(DATE))
        m.add(createFor(I8))
        m.add(createFor(I16))
        m.add(createFor(I32))
        m.add(createFor(I64))
        m.add(createFor(U8))
        m.add(createFor(U16))
        m.add(createFor(U32))
        m.add(createFor(U64))
        m.add(createFor(NULLABLE, (v): v is NullableMeta<any> => isMetadataContainer(v) && v.type === NULLABLE))
        m.add(createFor(ARRAY, (v): v is ArrayMeta<any[], any> => isMetadataContainer(v) && v.type === ARRAY))
        m.add(createFor(I8_ARRAY, (v): v is ArrayMeta<Int8Array, PrimitiveMeta<number>> => isMetadataContainer(v) && v.type === I8_ARRAY))
        m.add(createFor(I16_ARRAY, (v): v is ArrayMeta<Int16Array, PrimitiveMeta<number>> => isMetadataContainer(v) && v.type === I16_ARRAY))
        m.add(createFor(I32_ARRAY, (v): v is ArrayMeta<Int32Array, PrimitiveMeta<number>> => isMetadataContainer(v) && v.type === I32_ARRAY))
        m.add(createFor(I64_ARRAY, (v): v is ArrayMeta<BigInt64Array, PrimitiveMeta<bigint>> => isMetadataContainer(v) && v.type === I64_ARRAY))
        m.add(createFor(U8_ARRAY, (v): v is ArrayMeta<Uint8Array, PrimitiveMeta<number>> => isMetadataContainer(v) && v.type === U8_ARRAY))
        m.add(createFor(U16_ARRAY, (v): v is ArrayMeta<Uint16Array, PrimitiveMeta<number>> => isMetadataContainer(v) && v.type === U16_ARRAY))
        m.add(createFor(U32_ARRAY, (v): v is ArrayMeta<Uint32Array, PrimitiveMeta<number>> => isMetadataContainer(v) && v.type === U32_ARRAY))
        m.add(createFor(U64_ARRAY, (v): v is ArrayMeta<BigUint64Array, PrimitiveMeta<bigint>> => isMetadataContainer(v) && v.type === U64_ARRAY))
        m.add(createFor(SET, (v): v is SetMeta<any> => isMetadataContainer(v) && v.type === SET))
        m.add(createFor(MAP, (v): v is MapMeta<any> => isMetadataContainer(v) && v.type === MAP && 'key' in v && isMetadata(v.key)))
        m.add(createFor(OBJECT,
            (v): v is ObjectMeta<any> => isMetadata(v) && v.type === OBJECT &&
                'fields' in v && Array.isArray(v.fields) &&
                'build' in v && typeof v.build === 'function' &&
                'getFieldIndex' in v && typeof v.getFieldIndex === 'function'
        ))
        return m
    }

    return withMetadata(withNative(m))
}
