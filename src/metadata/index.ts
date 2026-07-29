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
    readonly add: <T, M extends BaseMeta<T, M>>(type: JType<T, M>) => void
    readonly addMany: (...jtypes: JType<any, any>[]) => void
    readonly remove: <T, M extends BaseMeta<T, M>>(type: TypeName | JType<T, M>) => boolean
    readonly clear: () => void
    readonly toMetadata: <T>(data: T) => BaseMeta<T, any>
}

export type MetadataOptions = {
    readonly withDefaults: (m: Metadata) => Metadata
}

export type JType<T, M extends BaseMeta<T, M>> = {
    readonly name: TypeName,
    readonly check: (data: any) => data is T
    readonly toMetadata: (data: T) => M
    readonly order: number
}

const defaultOptions: MetadataOptions = Object.freeze({ withDefaults })

export function metadata(options: MetadataOptions = defaultOptions): Metadata {
    const types = new Map<TypeName, JType<any, any>>()

    const orderTypes = (types: Map<TypeName, JType<any, any>>) => [...types.values()].sort((a, b) => a.order - b.order)

    let orderedTypes = orderTypes(types)

    const add = <T, M extends BaseMeta<T, M>>(jtype: JType<T, M>): void => {
        types.set(jtype.name, jtype)
        orderedTypes = orderTypes(types)
    }

    const addMany = (...jtypes: JType<any, any>[]): void => {
        jtypes.forEach((jtype) => types.set(jtype.name, jtype))
        orderedTypes = orderTypes(types)
    }

    const remove = <T, M extends BaseMeta<T, M>>(jtype: TypeName | JType<T, M>): boolean => {
        const type = typeof jtype === 'string' ? jtype : jtype.name
        const result = types.delete(type)
        orderedTypes = orderTypes(types)
        return result
    }

    const clear = (): void => {
        types.clear()
        orderedTypes = []
    }

    const toMetadata = <T>(data: T): BaseMeta<T, any> => {
        for (const type of orderedTypes) {
            if (type.check(data))
                return type.toMetadata(data)
        }
        throw new Error(``)
    }

    return options.withDefaults({
        add,
        addMany,
        remove,
        clear,
        toMetadata,
    })
}

export function withDefaults(m: Metadata): Metadata {
    const create = <M extends BaseMeta<MetaValue<M>, M>>(
        type: TypeName,
        check: (data: any) => data is MetaValue<M>,
        toMeta: (...args: any[]) => M,
        priority = 50
    ): JType<MetaValue<M>, M> => ({ name: type, check: check, toMetadata: toMeta, order: priority })

    m.addMany(
        create<PrimitiveMeta<string>>(JSONT.STRING, (v) => typeof v === 'string', string),
        create<PrimitiveMeta<number>>(JSONT.NUMBER, (v) => typeof v === 'number', number),
        create<PrimitiveMeta<bigint>>(JSONT.BIGINT, (v) => typeof v === 'bigint', bigInt),
        create<PrimitiveMeta<boolean>>(JSONT.BOOL, (v) => typeof v === 'boolean', bool),

        create<PrimitiveMeta<Date>>(JSONT.DATE, (v) => v instanceof Date, date),
        create<PrimitiveMeta<number>>(JSONT.I8, (v): v is number => v instanceof Int8, i8),
        create<PrimitiveMeta<number>>(JSONT.I16, (v): v is number => v instanceof Int16, i16),
        create<PrimitiveMeta<number>>(JSONT.I32, (v): v is number => v instanceof Int32, i32),
        create<PrimitiveMeta<bigint>>(JSONT.I64, (v): v is bigint => v instanceof Int64, i64),
        create<PrimitiveMeta<number>>(JSONT.U8, (v): v is number => v instanceof Uint8, u8),
        create<PrimitiveMeta<number>>(JSONT.U16, (v): v is number => v instanceof Uint16, u16),
        create<PrimitiveMeta<number>>(JSONT.U32, (v): v is number => v instanceof Uint32, u32),
        create<PrimitiveMeta<bigint>>(JSONT.U32, (v): v is bigint => v instanceof Uint64, u64),

        create<NullableMeta<any, any>>(JSONT.NULLABLE, (v) => v instanceof Nullable, nullable),

        create<ArrayMeta<any, any[], any>>(JSONT.ARRAY, (v) => Array.isArray(v), array),
        create<ArrayMeta<number, Int8Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (v) => v instanceof Int8Array, i8Array),
        create<ArrayMeta<number, Int16Array, PrimitiveMeta<number>>>(JSONT.I16_ARRAY, (v) => v instanceof Int16Array, i16Array),
        create<ArrayMeta<number, Int32Array, PrimitiveMeta<number>>>(JSONT.I32_ARRAY, (v) => v instanceof Int32Array, i32Array),
        create<ArrayMeta<number, Uint8Array, PrimitiveMeta<number>>>(JSONT.U8_ARRAY, (v) => v instanceof Uint8Array, u8Array),
        create<ArrayMeta<number, Uint16Array, PrimitiveMeta<number>>>(JSONT.U16_ARRAY, (v) => v instanceof Uint16Array, u16Array),
        create<ArrayMeta<number, Uint32Array, PrimitiveMeta<number>>>(JSONT.U32_ARRAY, (v) => v instanceof Uint32Array, u32Array),
        create<ArrayMeta<bigint, BigUint64Array, PrimitiveMeta<bigint>>>(JSONT.U64_ARRAY, (v) => v instanceof BigUint64Array, u64Array),
        create<ArrayMeta<bigint, BigInt64Array, PrimitiveMeta<bigint>>>(JSONT.I64_ARRAY, (v) => v instanceof BigInt64Array, i64Array),

        create<SetMeta<any, any>>(JSONT.SET, (v) => v instanceof Set, set),
        create<MapMeta<any, any>>(JSONT.MAP, (v) => v instanceof Map, map),

        create<ObjectMeta<{}>>(
            JSONT.OBJECT,
            (v): v is {} => isPlainObject(v),
            (d) => object(...Object.entries(d).map(([key, value]) => field(key, m.toMetadata(value))))
        )
    )
    return m
}
