import { JSONT } from "./baseTypes"
import { ArrayMeta, BaseMeta, MetaValue, MapMeta, NullableMeta, ObjectMeta, PrimitiveMeta, SetMeta, TypeName } from "./types"
import {
    array, bigInt, bool, date, field, i16, i16Array, i32, i32Array, i64,
    i64Array, i8, i8Array, map, nullable, number, object, set, string, u16,
    u16Array, u32, u32Array, u64, u64Array, u8, u8Array
} from "./builder"
import { Int16, Int32, Int64, Int8, Nullable, Uint16, Uint32, Uint64, Uint8 } from "./type-containers"
import { isPlainObject } from "../utils/object"

export type MetadataFactory = {
    add: <T, M extends BaseMeta<T, M>>(type: JType<T, M>) => void
    remove: <T, M extends BaseMeta<T, M>>(type: TypeName | JType<T, M>) => boolean
    clear: () => void
    toMetadata: <T>(data: T) => BaseMeta<T, any>
}

export type JType<T, M extends BaseMeta<T, M>> = {
    type: TypeName,
    isType: (data: any) => data is T
    toMetadata: (data: T) => M
    priority: number
}

export type WithDefaults = (m: MetadataFactory) => MetadataFactory

export type MetadataFactoryOptions = {
    withDefaults: WithDefaults
}

const defaultOptions: MetadataFactoryOptions = Object.freeze({ withDefaults: withDefaultTypes })

export function metadata(options: MetadataFactoryOptions = defaultOptions): MetadataFactory {
    const types = new Map<TypeName, JType<any, any>>()

    const add = <T, M extends BaseMeta<T, M>>(jtype: JType<T, M>): void => { types.set(jtype.type, jtype) }

    const remove = <T, M extends BaseMeta<T, M>>(jtype: TypeName | JType<T, M>): boolean => {
        const type = typeof jtype === 'string' ? jtype : jtype.type
        return types.delete(type)
    }

    const clear = (): void => types.clear()

    const toMetadata = <T>(data: T): BaseMeta<T, any> => {
        const prioritizedTypes = [...types.values()].sort((a, b) => a.priority - b.priority)

        for (const type of prioritizedTypes) {
            if (type.isType(data))
                return type.toMetadata(data)
        }

        throw new Error(``)
    }

    return options.withDefaults({
        add,
        remove,
        clear,
        toMetadata,
    })
}

export function withDefaultTypes(m: MetadataFactory): MetadataFactory {
    const create = <M extends BaseMeta<MetaValue<M>, M>>(
        type: TypeName,
        check: (data: any) => data is MetaValue<M>,
        toMeta: (...args: any[]) => M,
        priority = 50
    ): JType<MetaValue<M>, M> => ({ type, isType: check, toMetadata: toMeta, priority })

    m.add(create<PrimitiveMeta<string>>(JSONT.STRING, (v) => typeof v === 'string', string))
    m.add(create<PrimitiveMeta<number>>(JSONT.NUMBER, (v) => typeof v === 'number', number))
    m.add(create<PrimitiveMeta<bigint>>(JSONT.BIGINT, (v) => typeof v === 'bigint', bigInt))
    m.add(create<PrimitiveMeta<boolean>>(JSONT.BOOL, (v) => typeof v === 'boolean', bool))

    m.add(create<PrimitiveMeta<Date>>(JSONT.DATE, (v) => v instanceof Date, date))
    m.add(create<PrimitiveMeta<number>>(JSONT.I8, (v): v is number => v instanceof Int8, i8))
    m.add(create<PrimitiveMeta<number>>(JSONT.I16, (v): v is number => v instanceof Int16, i16))
    m.add(create<PrimitiveMeta<number>>(JSONT.I32, (v): v is number => v instanceof Int32, i32))
    m.add(create<PrimitiveMeta<bigint>>(JSONT.I64, (v): v is bigint => v instanceof Int64, i64))
    m.add(create<PrimitiveMeta<number>>(JSONT.U8, (v): v is number => v instanceof Uint8, u8))
    m.add(create<PrimitiveMeta<number>>(JSONT.U16, (v): v is number => v instanceof Uint16, u16))
    m.add(create<PrimitiveMeta<number>>(JSONT.U32, (v): v is number => v instanceof Uint32, u32))
    m.add(create<PrimitiveMeta<bigint>>(JSONT.U32, (v): v is bigint => v instanceof Uint64, u64))

    m.add(create<NullableMeta<any, any>>(JSONT.NULLABLE, (v) => v instanceof Nullable, nullable))

    m.add(create<ArrayMeta<any, any[], any>>(
        JSONT.ARRAY, (v) => Array.isArray(v), array))

    m.add(create<ArrayMeta<number, Int8Array, PrimitiveMeta<number>>>(
        JSONT.I8_ARRAY, (v) => v instanceof Int8Array, i8Array))
    m.add(create<ArrayMeta<number, Int16Array, PrimitiveMeta<number>>>(
        JSONT.I16_ARRAY, (v) => v instanceof Int16Array, i16Array))
    m.add(create<ArrayMeta<number, Int32Array, PrimitiveMeta<number>>>(
        JSONT.I32_ARRAY, (v) => v instanceof Int32Array, i32Array))

    m.add(create<ArrayMeta<number, Uint8Array, PrimitiveMeta<number>>>(
        JSONT.U8_ARRAY, (v) => v instanceof Uint8Array, u8Array))
    m.add(create<ArrayMeta<number, Uint16Array, PrimitiveMeta<number>>>(
        JSONT.U16_ARRAY, (v) => v instanceof Uint16Array, u16Array))
    m.add(create<ArrayMeta<number, Uint32Array, PrimitiveMeta<number>>>(
        JSONT.U32_ARRAY, (v) => v instanceof Uint32Array, u32Array))

    m.add(create<ArrayMeta<bigint, BigUint64Array, PrimitiveMeta<bigint>>>(
        JSONT.U64_ARRAY, (v) => v instanceof BigUint64Array, u64Array))
    m.add(create<ArrayMeta<bigint, BigInt64Array, PrimitiveMeta<bigint>>>(
        JSONT.I64_ARRAY, (v) => v instanceof BigInt64Array, i64Array))

    m.add(create<SetMeta<any, any>>(JSONT.SET, (v) => v instanceof Set, set))
    m.add(create<MapMeta<any, any>>(JSONT.MAP, (v) => v instanceof Map, map))

    m.add(create<ObjectMeta<{}>>(
        JSONT.OBJECT,
        (v): v is {} => isPlainObject(v),
        (d) => object(
            ...Object.entries(d).map(([key, value]) => field(key, m.toMetadata(value))))
    ))
    return m
}
