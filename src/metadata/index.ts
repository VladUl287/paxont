import { JSONT } from "./baseTypes"
import { ArrayMeta, BaseMeta, MapMeta, NullableMeta, ObjectMeta, PrimitiveMeta, SetMeta, TypeName } from "./types"
import {
    array, bigInt, bool, date, field, i16, i16Array, i32, i32Array, i64,
    i64Array, i8, i8Array, map, nullable, number, object, set, string, u16,
    u16Array, u32, u32Array, u64, u64Array, u8, u8Array
} from "./builder"
import { isPlainObject } from "../utils/object"
import { ReadResult } from "../utils/types"
import { isMetadata } from "./utils"

type HasMeta<T> = T extends object ? ([Extract<T[keyof T], BaseMeta<any, any>>] extends [never] ? false : true) : false
type ResultMeta<T extends BaseMeta<any, any>> = ReturnType<T['toValue']> extends ReadResult<infer U> ? U : never

export type Unwrap<T> =
    T extends BaseMeta<any, any> ? ResultMeta<T> :
    T extends (infer U)[] ? Unwrap<U>[] :
    T extends Set<infer U> ? Set<Unwrap<U>> :
    T extends Map<string, infer V> ? Map<string, Unwrap<V>> :
    HasMeta<T> extends true ? { [K in keyof T]: Unwrap<T[K]> } :
    T


export type Metadata = {
    readonly add: <Input, M extends BaseMeta<any, any>>(type: JType<Input, M>) => void
    readonly remove: (type: TypeName | JType<any, any>) => boolean
    readonly clear: () => void
    readonly from: <T>(data: T) => BaseMeta<Unwrap<T>, any>
}

export type MetadataOptions = {
    readonly withDefaults: (m: Metadata) => Metadata
}

export type JType<Input, Meta extends BaseMeta<any, Meta>> = {
    readonly name: TypeName,
    readonly is: (input: any) => input is Input
    readonly from: (input: Input, metadata: Metadata) => Meta
    readonly order: number
}

const defaultOptions: MetadataOptions = Object.freeze({ withDefaults })

export function metadata(options: MetadataOptions = defaultOptions): Metadata {
    const jTypes = new Array<JType<any, any>>()

    const add = <Input, M extends BaseMeta<any, any>>(type: JType<Input, M>): void => {
        jTypes.push(type)
        jTypes.sort((a, b) => a.order - b.order)
    }

    const remove = (type: TypeName | JType<any, any>): boolean => {
        const inputType = typeof type === 'string' ? type : type.name

        let count = 0
        jTypes.sort((a, b) => {
            const result = a.name === inputType ? 1 : 0
            count += result
            return result
        })
        jTypes.splice(jTypes.length - count, count)

        return count > 0
    }

    const clear = (): void => {
        jTypes.splice(0, jTypes.length)
    }

    const from = <T>(data: T): BaseMeta<Unwrap<T>, any> => {
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
        m.add({ name: JSONT.STRING, is: (v) => typeof v === 'string', from: () => string(), order: 50 })
        m.add({ name: JSONT.NUMBER, is: (v) => typeof v === 'number', from: () => number(), order: 50 })
        m.add({ name: JSONT.BIGINT, is: (v) => typeof v === 'bigint', from: () => bigInt(), order: 50 })
        m.add({ name: JSONT.BOOL, is: (v) => typeof v === 'boolean', from: () => bool(), order: 50 })
        m.add({ name: JSONT.DATE, is: (v) => v instanceof Date, from: () => date(), order: 50 })

        m.add({ name: JSONT.I8_ARRAY, is: (v) => v instanceof Int8Array, from: () => i8Array(), order: 50 })
        m.add({ name: JSONT.I16_ARRAY, is: (v) => v instanceof Int16Array, from: () => i16Array(), order: 50 })
        m.add({ name: JSONT.I32_ARRAY, is: (v) => v instanceof Int32Array, from: () => i32Array(), order: 50 })
        m.add({ name: JSONT.I64_ARRAY, is: (v) => v instanceof BigInt64Array, from: () => i64Array(), order: 50 })
        m.add({ name: JSONT.U8_ARRAY, is: (v) => v instanceof Uint8Array, from: () => u8Array(), order: 50 })
        m.add({ name: JSONT.U16_ARRAY, is: (v) => v instanceof Uint16Array, from: () => u16Array(), order: 50 })
        m.add({ name: JSONT.U32_ARRAY, is: (v) => v instanceof Uint32Array, from: () => u32Array(), order: 50 })
        m.add({ name: JSONT.U64_ARRAY, is: (v) => v instanceof BigUint64Array, from: () => u64Array(), order: 50 })

        m.add({ name: JSONT.ARRAY, is: (v) => Array.isArray(v), from: (a, m) => array(m.from(a[0])), order: 50 })
        m.add({ name: JSONT.SET, is: (v) => v instanceof Set, from: (s, m) => set(m.from([...s.values()][0])), order: 50 })
        m.add({ name: JSONT.MAP, is: (v) => v instanceof Map, from: (ma, m) => map(m.from([...ma.values()][0])), order: 50 })

        m.add({
            name: JSONT.OBJECT,
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
        const combine = <M extends BaseMeta<any, any>>(m: M) => (o: M) => ({ ...o, ...m })
        const isMeta = (type: TypeName) => <T>(v: any): v is T => isMetadata(v) && v.type === type
        const create = <M extends BaseMeta<any, any>>(type: TypeName, to: (m: M) => M, order = 50) =>
            ({ name: type, is: isMeta(type), from: to, order })

        m.add(create<PrimitiveMeta<string>>(JSONT.STRING, (m) => string(combine(m))))
        m.add(create<PrimitiveMeta<number>>(JSONT.NUMBER, (m) => number(combine(m))))
        m.add(create<PrimitiveMeta<bigint>>(JSONT.BIGINT, (m) => bigInt(combine(m))))
        m.add(create<PrimitiveMeta<boolean>>(JSONT.BOOL, (m) => bool(combine(m))))
        m.add(create<PrimitiveMeta<Date>>(JSONT.DATE, (m) => date(combine(m))))

        m.add(create<PrimitiveMeta<number>>(JSONT.I8, (m) => i8(combine(m))))
        m.add(create<PrimitiveMeta<number>>(JSONT.I16, (m) => i16(combine(m))))
        m.add(create<PrimitiveMeta<number>>(JSONT.I32, (m) => i32(combine(m))))
        m.add(create<PrimitiveMeta<bigint>>(JSONT.I64, (m) => i64(combine(m))))
        m.add(create<PrimitiveMeta<number>>(JSONT.U8, (m) => u8(combine(m))))
        m.add(create<PrimitiveMeta<number>>(JSONT.U16, (m) => u16(combine(m))))
        m.add(create<PrimitiveMeta<number>>(JSONT.U32, (m) => u32(combine(m))))
        m.add(create<PrimitiveMeta<bigint>>(JSONT.U64, (m) => u64(combine(m))))

        m.add(create<NullableMeta<any>>(JSONT.NULLABLE, (m) => nullable({ ...m.value }, combine(m))))

        m.add(create<ArrayMeta<any[], any>>(JSONT.ARRAY, (m) => array({ ...m.value }, combine(m))))
        m.add(create<ArrayMeta<Int8Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (m) => i8Array(combine(m))))
        m.add(create<ArrayMeta<Int16Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (m) => i16Array(combine(m))))
        m.add(create<ArrayMeta<Int32Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (m) => i32Array(combine(m))))
        m.add(create<ArrayMeta<BigInt64Array, PrimitiveMeta<bigint>>>(JSONT.I8_ARRAY, (m) => i64Array(combine(m))))
        m.add(create<ArrayMeta<Uint8Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (m) => u8Array(combine(m))))
        m.add(create<ArrayMeta<Uint16Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (m) => u16Array(combine(m))))
        m.add(create<ArrayMeta<Uint32Array, PrimitiveMeta<number>>>(JSONT.I8_ARRAY, (m) => u32Array(combine(m))))
        m.add(create<ArrayMeta<BigUint64Array, PrimitiveMeta<bigint>>>(JSONT.I8_ARRAY, (m) => u64Array(combine(m))))

        m.add(create<SetMeta<any>>(JSONT.SET, (m) => set(m.value, combine(m))))
        m.add(create<MapMeta<any>>(JSONT.MAP, (m) => map(m.value, combine(m))))

        m.add(create<ObjectMeta<{}>>(JSONT.OBJECT, (m) => ({ ...object(...m.fields), ...m })))
        return m
    }

    return withMetadata(withNative(m))
}
