import { JSONT } from "./baseTypes"
import { BaseMeta, JType, TypeName } from "./types"
import { array, bigInt, bool, date, field, i16, i16Array, i32, i32Array, i64, i64Array, i8, i8Array, map, nullable, number, object, set, string, u16, u16Array, u32, u32Array, u64, u64Array, u8, u8Array } from "./builder"
import { Int16, Int32, Int64, Int8, Nullable, Uint16, Uint32, Uint64, Uint8 } from "../utils/types"
import { isPlainObject } from "../utils/object"

type UseMetadata = {
    addType: <M extends BaseMeta<any, any>>(type: JType<M>) => void
    deleteType: (type: TypeName | JType) => boolean
    getTypes: () => JType[]
    clearTypes: () => void
    hasType: (name: TypeName) => boolean
    toMetadata: <T>(data: T) => BaseMeta<T, any>
}

export function useMetadata(): UseMetadata {
    const types = new Map<TypeName, JType>()

    const withDefaultTypes = (meta: UseMetadata): UseMetadata => {
        const types: JType<BaseMeta<any, any>>[] = [
            { type: JSONT.STRING, check: (d) => typeof d === 'string', toMeta: string, priority: 50 },
            { type: JSONT.NUMBER, check: (d) => typeof d === 'number', toMeta: number, priority: 50 },
            { type: JSONT.BIGINT, check: (d) => typeof d === 'bigint', toMeta: bigInt, priority: 50 },
            { type: JSONT.BOOL, check: (d) => typeof d === 'boolean', toMeta: bool, priority: 50 },
            { type: JSONT.DATE, check: (d) => d instanceof Date, toMeta: date, priority: 50 },
            { type: JSONT.ARRAY, check: (d) => Array.isArray(d), toMeta: (v) => array(meta.toMetadata(v)), priority: 50 },
            { type: JSONT.SET, check: (d) => d instanceof Set, toMeta: (v) => set(meta.toMetadata(v)), priority: 50 },
            { type: JSONT.MAP, check: (d) => d instanceof Map, toMeta: (v) => map(meta.toMetadata(v)), priority: 50 },
            { type: JSONT.NULLABLE, check: (d) => d instanceof Nullable, toMeta: (v) => nullable(meta.toMetadata(v)), priority: 50 },
            { type: JSONT.I8, check: (d) => d instanceof Int8, toMeta: i8, priority: 50 },
            { type: JSONT.I16, check: (d) => d instanceof Int16, toMeta: i16, priority: 50 },
            { type: JSONT.I32, check: (d) => d instanceof Int32, toMeta: i32, priority: 50 },
            { type: JSONT.I64, check: (d) => d instanceof Int64, toMeta: i64, priority: 50 },
            { type: JSONT.U8, check: (d) => d instanceof Uint8, toMeta: u8, priority: 50 },
            { type: JSONT.U16, check: (d) => d instanceof Uint16, toMeta: u16, priority: 50 },
            { type: JSONT.U32, check: (d) => d instanceof Uint32, toMeta: u32, priority: 50 },
            { type: JSONT.U64, check: (d) => d instanceof Uint64, toMeta: u64, priority: 50 },
            { type: JSONT.I8_ARRAY, check: (d) => d instanceof Int8Array, toMeta: i8Array, priority: 50 },
            { type: JSONT.I16_ARRAY, check: (d) => d instanceof Int16Array, toMeta: i16Array, priority: 50 },
            { type: JSONT.I32_ARRAY, check: (d) => d instanceof Int32Array, toMeta: i32Array, priority: 50 },
            { type: JSONT.I64_ARRAY, check: (d) => d instanceof BigInt64Array, toMeta: i64Array, priority: 50 },
            { type: JSONT.U8_ARRAY, check: (d) => d instanceof Uint8Array, toMeta: u8Array, priority: 50 },
            { type: JSONT.U16_ARRAY, check: (d) => d instanceof Uint16Array, toMeta: u16Array, priority: 50 },
            { type: JSONT.U32_ARRAY, check: (d) => d instanceof Uint32Array, toMeta: u32Array, priority: 50 },
            { type: JSONT.U64_ARRAY, check: (d) => d instanceof BigUint64Array, toMeta: u64Array, priority: 50 },
            {
                type: JSONT.OBJECT,
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

    const deleteType = (jtype: TypeName | JType): boolean => {
        const type = typeof jtype === 'string' ? jtype : jtype.type
        return types.delete(type)
    }

    const hasType = (name: TypeName): boolean => types.has(name)

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
