import { JSONT } from "./baseTypes"
import { ArrayMeta, BaseMeta, MetaValue, MapMeta, NullableMeta, ObjectMeta, PrimitiveMeta, SetMeta, TypeName } from "./types"
import {
    array, bigInt, bool, date, field, i16, i16Array, i32, i32Array, i64,
    i64Array, i8, i8Array, map, nullable, number, object, set, string, u16,
    u16Array, u32, u32Array, u64, u64Array, u8, u8Array
} from "./builder"
import { Int16, Int32, Int64, Int8, Nullable, Uint16, Uint32, Uint64, Uint8 } from "./type-containers"
import { isPlainObject } from "../utils/object"

export type Metadata = {
    readonly add: <M extends BaseMeta<any, M>>(type: JType<M>) => void
    readonly remove: <M extends BaseMeta<any, M>>(type: TypeName | JType<M>) => boolean
    readonly clear: () => void
    readonly from: <T>(data: T) => BaseMeta<T, any>
}

export type MetadataOptions = {
    readonly withDefaults: (m: Metadata) => Metadata
}

export type JType<M extends BaseMeta<any, M>> = {
    readonly name: TypeName,
    readonly check: (data: any) => data is MetaValue<M>
    readonly toMeta: (data: MetaValue<M>, meta: Metadata) => M
    readonly order: number
}

const defaultOptions: MetadataOptions = Object.freeze({ withDefaults })

export function metadata(options: MetadataOptions = defaultOptions): Metadata {
    const jTypes = new Map<TypeName, JType<any>>()

    const sort = (types: Map<TypeName, JType<any>>) => [...types.values()].sort((a, b) => a.order - b.order)

    let jTypesSorted = sort(jTypes)

    const add = <M extends BaseMeta<any, M>>(type: JType<M>): void => {
        jTypes.set(type.name, type)
        jTypesSorted = sort(jTypes)
    }

    const remove = <M extends BaseMeta<any, M>>(type: TypeName | JType<M>): boolean => {
        const inputType = typeof type === 'string' ? type : type.name
        const result = jTypes.delete(inputType)
        jTypesSorted = sort(jTypes)
        return result
    }

    const clear = (): void => {
        jTypes.clear()
        jTypesSorted = []
    }

    const from = <T>(data: T): BaseMeta<T, any> => {
        for (const type of jTypesSorted) {
            if (type.check(data)) {
                return type.toMeta(data, instance)
            }
        }
        throw new Error(`Cannot create metadata for value of type ${typeof data}: ${JSON.stringify(data)}.`)
    }

    const instance = { add, remove, clear, from }

    return options.withDefaults(instance)
}

export function withDefaults(m: Metadata): Metadata {
    m.add({ name: JSONT.STRING, check: (v) => typeof v === 'string', toMeta: () => string(), order: 50 })
    m.add({ name: JSONT.NUMBER, check: (v) => typeof v === 'number', toMeta: () => number(), order: 50 })
    m.add({ name: JSONT.BIGINT, check: (v) => typeof v === 'bigint', toMeta: () => bigInt(), order: 50 })
    m.add({ name: JSONT.BOOL, check: (v) => typeof v === 'boolean', toMeta: () => bool(), order: 50 })

    m.add({ name: JSONT.DATE, check: (v) => v instanceof Date, toMeta: () => date(), order: 50 })
    m.add({ name: JSONT.I8, check: (v): v is number => v instanceof Int8, toMeta: () => i8(), order: 50 })
    m.add({ name: JSONT.I16, check: (v): v is number => v instanceof Int16, toMeta: () => i16(), order: 50 })
    m.add({ name: JSONT.I32, check: (v): v is number => v instanceof Int32, toMeta: () => i32(), order: 50 })
    m.add({ name: JSONT.I64, check: (v): v is bigint => v instanceof Int64, toMeta: () => i64(), order: 50 })
    m.add({ name: JSONT.U8, check: (v): v is number => v instanceof Uint8, toMeta: () => u8(), order: 50 })
    m.add({ name: JSONT.U16, check: (v): v is number => v instanceof Uint16, toMeta: () => u16(), order: 50 })
    m.add({ name: JSONT.U32, check: (v): v is number => v instanceof Uint32, toMeta: () => u32(), order: 50 })
    m.add({ name: JSONT.U64, check: (v): v is bigint => v instanceof Uint64, toMeta: () => u64(), order: 50 })

    m.add<NullableMeta<any, any>>(
        {
            name: JSONT.NULLABLE,
            check: (value) => value instanceof Nullable,
            toMeta: (value, meta) => nullable(meta.from(value.value)),
            order: 50
        })

    m.add<ArrayMeta<any, any[], any>>(
        {
            name: JSONT.ARRAY,
            check: (v) => Array.isArray(v),
            toMeta: (arr, meta) => array(meta.from(arr[0])),
            order: 50
        })

    m.add({ name: JSONT.I8_ARRAY, check: (v) => v instanceof Int8Array, toMeta: () => i8Array(), order: 50 })
    m.add({ name: JSONT.I16_ARRAY, check: (v) => v instanceof Int16Array, toMeta: () => i16Array(), order: 50 })
    m.add({ name: JSONT.I32_ARRAY, check: (v) => v instanceof Int32Array, toMeta: () => i32Array(), order: 50 })
    m.add({ name: JSONT.I64_ARRAY, check: (v) => v instanceof BigInt64Array, toMeta: () => i64Array(), order: 50 })
    m.add({ name: JSONT.U8_ARRAY, check: (v) => v instanceof Uint8Array, toMeta: () => u8Array(), order: 50 })
    m.add({ name: JSONT.U16_ARRAY, check: (v) => v instanceof Uint16Array, toMeta: () => u16Array(), order: 50 })
    m.add({ name: JSONT.U32_ARRAY, check: (v) => v instanceof Uint32Array, toMeta: () => u32Array(), order: 50 })
    m.add({ name: JSONT.U64_ARRAY, check: (v) => v instanceof BigUint64Array, toMeta: () => u64Array(), order: 50 })

    m.add<SetMeta<any, any>>({
        name: JSONT.SET,
        check: (v) => v instanceof Set,
        toMeta: (s, meta) => set(meta.from([...s.values()][0])),
        order: 50
    })
    m.add<MapMeta<any, any>>({
        name: JSONT.MAP,
        check: (v) => v instanceof Map,
        toMeta: (m, meta) => map(meta.from([...m.values()][0])),
        order: 50
    })

    m.add<ObjectMeta<{}>>(
        {
            name: JSONT.OBJECT,
            check: (v): v is {} => isPlainObject(v),
            toMeta: (o, meta) => {
                const fields = Object.entries(o).map(([key, value]) => field(key, meta.from(value)))
                return object(...fields)
            },
            order: 50
        })

    return m
}
