import { ARRAY, BIGINT, BOOL, DATE, F64_ARRAY, I16, I16_ARRAY, I32, I32_ARRAY, I64, I64_ARRAY, I8, I8_ARRAY, MAP, NULLABLE, NUMBER, OBJECT, SET, STRING, U16, U16_ARRAY, U32, U32_ARRAY, U64, U64_ARRAY, U8, U8_ARRAY } from "./baseTypes"
import { ArrayMeta, BaseMeta, MapMeta, MetaValue, NullableMeta, ObjectMeta, PrimitiveMeta, SetMeta, TypeName } from "./types"
import {
    array, bigInt, bool, date, f64Array, field, i16, i16Array, i32, i32Array, i64,
    i64Array, i8, i8Array, map, nullable, number, object, set, string, u16,
    u16Array, u32, u32Array, u64, u64Array, u8, u8Array
} from "./builder"
import { isPlainObject } from "../utils/object"
import { isMetadata } from "./utils"

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
    readonly add: <Input, M extends BaseMeta<any>>(type: JType<Input, M>) => void
    readonly remove: (type: TypeName | JType<any, any>) => boolean
    readonly clear: () => void
    readonly from: <T, R extends BaseMeta<any> = BaseMeta<Unwrap<T>>>(data: T) => R
}

export type MetadataOptions = {
    readonly withDefaults: (m: Metadata) => Metadata
}

export type JType<Input, Meta extends BaseMeta<any>> = {
    readonly name: TypeName,
    readonly is: (input: any) => input is Input
    readonly from: (input: Input, metadata: Metadata) => Meta
    readonly order: number
}

const defaultOptions: MetadataOptions = Object.freeze({ withDefaults })

export function metadata(options: MetadataOptions = defaultOptions): Metadata {
    const jTypes = new Array<JType<any, any>>()

    const add = <Input, M extends BaseMeta<any>>(type: JType<Input, M>): void => {
        jTypes.push(type)
        jTypes.sort((a, b) => a.order - b.order)
    }

    const remove = (type: TypeName | JType<any, any>): boolean => {
        const inputType = typeof type === 'string' ? type : type.name

        let count = 0
        jTypes.sort((a, _) => {
            const result = a.name === inputType ? 1 : 0
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

    return options.withDefaults(instance)
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
        const combine = <M extends BaseMeta<any>>(m: M) => (o: M) => ({ ...o, ...m })
        const isMeta = (type: TypeName) => <T>(v: any): v is T => isMetadata(v) && v.type === type
        const create = <M extends BaseMeta<any>>(type: TypeName, to: (m: M) => M, order = 50) =>
            ({ name: type, is: isMeta(type), from: to, order })

        m.add(create<PrimitiveMeta<string>>(STRING, (m) => string(combine(m))))
        m.add(create<PrimitiveMeta<number>>(NUMBER, (m) => number(combine(m))))
        m.add(create<PrimitiveMeta<bigint>>(BIGINT, (m) => bigInt(combine(m))))
        m.add(create<PrimitiveMeta<boolean>>(BOOL, (m) => bool(combine(m))))
        m.add(create<PrimitiveMeta<Date>>(DATE, (m) => date(combine(m))))

        m.add(create<PrimitiveMeta<number>>(I8, (m) => i8(combine(m))))
        m.add(create<PrimitiveMeta<number>>(I16, (m) => i16(combine(m))))
        m.add(create<PrimitiveMeta<number>>(I32, (m) => i32(combine(m))))
        m.add(create<PrimitiveMeta<bigint>>(I64, (m) => i64(combine(m))))
        m.add(create<PrimitiveMeta<number>>(U8, (m) => u8(combine(m))))
        m.add(create<PrimitiveMeta<number>>(U16, (m) => u16(combine(m))))
        m.add(create<PrimitiveMeta<number>>(U32, (m) => u32(combine(m))))
        m.add(create<PrimitiveMeta<bigint>>(U64, (m) => u64(combine(m))))

        m.add(create<NullableMeta<any>>(NULLABLE, (m) => nullable({ ...m.value }, combine(m))))

        m.add(create<ArrayMeta<any[], any>>(ARRAY, (m) => array({ ...m.value }, combine(m))))
        m.add(create<ArrayMeta<Int8Array, PrimitiveMeta<number>>>(I8_ARRAY, (m) => i8Array(combine(m))))
        m.add(create<ArrayMeta<Int16Array, PrimitiveMeta<number>>>(I8_ARRAY, (m) => i16Array(combine(m))))
        m.add(create<ArrayMeta<Int32Array, PrimitiveMeta<number>>>(I8_ARRAY, (m) => i32Array(combine(m))))
        m.add(create<ArrayMeta<BigInt64Array, PrimitiveMeta<bigint>>>(I8_ARRAY, (m) => i64Array(combine(m))))
        m.add(create<ArrayMeta<Uint8Array, PrimitiveMeta<number>>>(I8_ARRAY, (m) => u8Array(combine(m))))
        m.add(create<ArrayMeta<Uint16Array, PrimitiveMeta<number>>>(I8_ARRAY, (m) => u16Array(combine(m))))
        m.add(create<ArrayMeta<Uint32Array, PrimitiveMeta<number>>>(I8_ARRAY, (m) => u32Array(combine(m))))
        m.add(create<ArrayMeta<BigUint64Array, PrimitiveMeta<bigint>>>(I8_ARRAY, (m) => u64Array(combine(m))))

        m.add(create<SetMeta<any>>(SET, (m) => set(m.value, combine(m))))
        m.add(create<MapMeta<any>>(MAP, (m) => map(m.value, combine(m))))

        m.add(create<ObjectMeta<{}>>(OBJECT, (m) => ({ ...object(...m.fields), ...m })))
        return m
    }

    return withMetadata(withNative(m))
}
