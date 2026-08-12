import { toArray } from "../converters/array"
import {
    ArrayMeta,
    BaseMeta, MetaValue, MapMeta, NullableMeta, ObjectField,
    ObjectMeta, PrimitiveMeta, SetMeta,
    TypeName
} from "./types"
import { ARRAY, BaseType, BIGINT, BOOL, DATE, F64_ARRAY, I16, I16_ARRAY, I32, I32_ARRAY, I64, I64_ARRAY, I8, I8_ARRAY, MAP, NULLABLE, NUMBER, OBJECT, SET, STRING, U16, U16_ARRAY, U32, U32_ARRAY, U64, U64_ARRAY, U8, U8_ARRAY, } from "./baseTypes"
import { toDate } from "../converters/date"
import { toMap } from "../converters/map"
import { toSet } from "../converters/set"
import { genObjectFactory, genObjectToJsonFactory } from "../code_gen/object"
import { generateTrie } from "../code_gen/trie"
import { toObject } from "../converters/object"
import { toNullable } from "../converters/nullable"
import { toBigInt, toInt64, toUint64 } from "../converters/number/bigint"
import { toBoolean } from "../converters/boolean"
import { toString } from "../converters/string"
import { ArrayLikeWritable, ArrayPool, BigIntTypedArray, FloatTypedArray, IntegerTypedArray, arrayPool } from "../utils/array"
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from "../converters/number/int"
import { toFloat } from "../converters/number/float"
import { Expand } from "../utils/types"
import { isMetadata, isMetadataContainer } from "./utils"
import { bindPool } from "./modifiers"

export type Modifier<M extends BaseMeta<any>> = (metadata: M) => M

export type BuilderOptions = {
    encoder: TextEncoder,
    poolFor: <M extends BaseMeta<any>>(meta?: M) => ArrayPool<MetaValue<M>>
}

const globalPools: Record<TypeName, ArrayPool<any>> = {
    number: arrayPool<Array<number>>(Array),
    string: arrayPool<Array<string>>(Array),
    object: arrayPool<Array<object>>(Array),
    boolean: arrayPool<Array<boolean>>(Array),
    date: arrayPool<Array<Date>>(Array),
    bigint: arrayPool<Array<bigint>>(Array),
    set: arrayPool<Array<Set<any>>>(Array),
    map: arrayPool<Array<Map<string, any>>>(Array),
    array: arrayPool<Array<object>>(Array),
    nullable: arrayPool(Array),
    i8: arrayPool(Int8Array),
    i16: arrayPool(Int16Array),
    i32: arrayPool(Int32Array),
    i64: arrayPool(BigInt64Array),
    u8: arrayPool(Uint8Array),
    u16: arrayPool(Uint16Array),
    u32: arrayPool(Uint32Array),
    u64: arrayPool(BigUint64Array),
    'i8[]': arrayPool<Array<Int8Array>>(Array),
    'i16[]': arrayPool<Array<Int16Array>>(Array),
    'i32[]': arrayPool<Array<Int32Array>>(Array),
    'i64[]': arrayPool<Array<BigInt64Array>>(Array),
    'u8[]': arrayPool<Array<Uint8Array>>(Array),
    'u16[]': arrayPool<Array<Uint16Array>>(Array),
    'u32[]': arrayPool<Array<Uint32Array>>(Array),
    'u64[]': arrayPool<Array<BigUint64Array>>(Array),
    'f64[]': arrayPool<Array<Float64Array>>(Array),
    'unknown': arrayPool(Array),
}

const defaultBuilderOptions: BuilderOptions = {
    encoder: new TextEncoder(),
    poolFor: <M extends BaseMeta<any>>(meta?: M): ArrayPool<MetaValue<M>> => {
        if (meta) {
            if (meta.type === NULLABLE && isMetadataContainer(meta)) {
                return (globalPools[meta.value.type] ??= arrayPool(Array))
            }
            return (globalPools[meta.type] ??= arrayPool(Array))
        }
        return (globalPools['unknown'] ??= arrayPool(Array))
    }
}

export function builder({ encoder, poolFor }: BuilderOptions = defaultBuilderOptions) {
    const string = (...modifiers: Modifier<PrimitiveMeta<string>>[]) =>
        primitive(STRING, toString, (v) => {
            if (typeof v !== 'string') { throw new Error() }
            return `"${v}"`
        }, ...modifiers)

    const number = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(NUMBER, toFloat, (v) => {
            if (typeof v !== 'number') { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const bigInt = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
        primitive(BIGINT, toBigInt, (v) => {
            if (typeof v !== 'bigint') { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const bool = (...modifiers: Modifier<PrimitiveMeta<boolean>>[]) =>
        primitive(BOOL, toBoolean, (v) => {
            if (typeof v !== 'boolean') { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const date = (...modifiers: Modifier<PrimitiveMeta<Date>>[]) =>
        primitive(DATE, toDate, (v) => {
            if (!(v instanceof Date)) { throw new Error() }
            return `"${v.toISOString()}"`
        }, ...modifiers)

    const u8 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(U8, toUint8, (v) => {
            if (!Number.isInteger(v)) { throw new Error() }
            if (v < 0 || v > 255) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const u16 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(U16, toUint16, (v) => {
            if (!Number.isInteger(v)) { throw new Error() }
            if (v < 0 || v > 65535) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const u32 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(U32, toUint32, (v) => {
            if (!Number.isInteger(v)) { throw new Error() }
            if (v < 0 || v > 4294967295) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const i8 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(I8, toInt8, (v) => {
            if (!Number.isInteger(v)) { throw new Error() }
            if (v < -128 || v > 127) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const i16 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(I16, toInt16, (v) => {
            if (!Number.isInteger(v)) { throw new Error() }
            if (v < -32768 || v > 32767) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const i32 = (...modifiers: Modifier<PrimitiveMeta<number>>[]) =>
        primitive(I32, toInt32, (v) => {
            if (!Number.isInteger(v)) { throw new Error() }
            if (v < -2147483648 || v > 2147483647) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const u64 = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
        primitive(U64, toUint64, (v) => {
            if (typeof v !== 'bigint') { throw new Error() }
            if (v < 0 || v > 18446744073709551615n) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    const i64 = (...modifiers: Modifier<PrimitiveMeta<bigint>>[]) =>
        primitive(I64, toInt64, (v) => {
            if (typeof v !== 'bigint') { throw new Error() }
            if (v < -9223372036854775808n || v > 9223372036854775807n) { throw new Error() }
            return v.toString()
        }, ...modifiers)

    function applyModifier<M extends BaseMeta<any>>(value: M, modify: Modifier<M>): M {
        return Object.assign({}, modify(value), { type: value.type })
    }

    const primitive = <T>(
        type: BaseType,
        toValue: PrimitiveMeta<T>['toValue'],
        toJson: (value: T) => string,
        ...modifiers: Modifier<PrimitiveMeta<T>>[]
    ): PrimitiveMeta<T> => {
        const defaultMeta: PrimitiveMeta<T> = {
            type: type,
            toValue: toValue,
            toJson: (m, v, _) => toJson(v)
        }
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    const nullable = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<NullableMeta<M>>[]
    ): NullableMeta<M> => {
        const defaultMeta: NullableMeta<M> = {
            type: NULLABLE,
            toJson: (meta, value, options) => {
                if (value === null) return 'null'
                return meta.value.toJson(meta.value, value, options)
            },
            toValue: toNullable,
            value: value
        }
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    const array = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<ArrayMeta<MetaValue<M>[], M>>[]
    ): ArrayMeta<MetaValue<M>[], M> => {
        const defaultMeta: ArrayMeta<MetaValue<M>[], M> = {
            type: ARRAY,
            toValue: toArray,
            toJson: (meta, value, options) => {
                if (!Array.isArray(value)) {
                    throw new Error()
                }
                const toJson = meta.value.toJson
                return `[${value.map(c => toJson(meta.value, c, options)).join(',')}]`
            },
            value: value,
            pool: poolFor()
        }
        bindPool(poolFor(defaultMeta))
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    const u8Array = (...modifiers: Modifier<ArrayMeta<Uint8Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Uint8Array>(U8_ARRAY, u8(), ...modifiers)
    const u16Array = (...modifiers: Modifier<ArrayMeta<Uint16Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Uint16Array>(U16_ARRAY, u16(), ...modifiers)
    const u32Array = (...modifiers: Modifier<ArrayMeta<Uint32Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Uint32Array>(U32_ARRAY, u32(), ...modifiers)
    const i8Array = (...modifiers: Modifier<ArrayMeta<Int8Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Int8Array>(I8_ARRAY, i8(), ...modifiers)
    const i16Array = (...modifiers: Modifier<ArrayMeta<Int16Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Int16Array>(I16_ARRAY, i16(), ...modifiers)
    const i32Array = (...modifiers: Modifier<ArrayMeta<Int32Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Int32Array>(I32_ARRAY, i32(), ...modifiers)
    const f64Array = (...modifiers: Modifier<ArrayMeta<Float64Array, PrimitiveMeta<number>>>[]) =>
        typedArray<Float64Array>(F64_ARRAY, number(), ...modifiers)

    const u64Array = (...modifiers: Modifier<ArrayMeta<BigUint64Array, PrimitiveMeta<bigint>>>[]) =>
        bigIntTypedArray<BigUint64Array>(U64_ARRAY, u64(), ...modifiers)
    const i64Array = (...modifiers: Modifier<ArrayMeta<BigInt64Array, PrimitiveMeta<bigint>>>[]) =>
        bigIntTypedArray<BigInt64Array>(I64_ARRAY, i64(), ...modifiers)

    const typedArray = <T extends ArrayLikeWritable<number> & (IntegerTypedArray | FloatTypedArray)>(
        type: BaseType,
        value: PrimitiveMeta<number>,
        ...modifiers: Modifier<ArrayMeta<T, PrimitiveMeta<number>>>[]
    ): ArrayMeta<T, PrimitiveMeta<number>> => {
        const defaultMeta: ArrayMeta<T, PrimitiveMeta<number>> = {
            type: type,
            toValue: toArray,
            toJson: (meta, value, options) => {
                const valueMeta = meta.value
                const values = [...value]
                const result = values
                    .map(
                        function (this: typeof valueMeta, number: number) {
                            return valueMeta.toJson(valueMeta, number, options)
                        },
                        valueMeta)
                    .join(',')
                return `[${result}]`
            },
            value: value,
            pool: globalPools[value.type]
        }
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    const bigIntTypedArray = <T extends ArrayLikeWritable<bigint> & BigIntTypedArray>(
        type: BaseType,
        value: PrimitiveMeta<bigint>,
        ...modifiers: Modifier<ArrayMeta<T, PrimitiveMeta<bigint>>>[]
    ): ArrayMeta<T, PrimitiveMeta<bigint>> => {
        const defaultMeta: ArrayMeta<T, PrimitiveMeta<bigint>> = {
            type: type,
            toValue: toArray,
            toJson: (meta, value, options) => {
                const valueMeta = meta.value
                const values = [...value]
                const result = values
                    .map(
                        function (this: typeof valueMeta, number: bigint) {
                            return valueMeta.toJson(valueMeta, number, options)
                        },
                        valueMeta)
                    .join(',')
                return `[${result}]`
            },
            value: value,
            pool: globalPools[value.type]
        }
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    const map = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<MapMeta<M>>[]
    ): MapMeta<M> => {
        const defaultMeta: MapMeta<M> = {
            type: MAP,
            key: string(),
            value: value,
            toValue: toMap,
            toJson: (m, v, o) => {
                const meta = m.value
                const toJson = meta.toJson
                return `{${[...v.entries()].map(c => `"${c[0]}":${toJson(meta, c[1], o)}`).join(',')}}`
            }
        }
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    const set = <M extends BaseMeta<any>>(
        value: M,
        ...modifiers: Modifier<SetMeta<M>>[]
    ): SetMeta<M> => {
        const defaultMeta: SetMeta<M> = {
            type: SET,
            value: value,
            toValue: toSet,
            toJson: (meta, set, options) => {
                const valueMeta = meta.value
                const toJson = valueMeta.toJson
                const values = Array.from(set)
                    .map(value => toJson(valueMeta, value, options))
                    .join(',')
                return `[${values}]`
            }
        }
        return modifiers.reduce(applyModifier, defaultMeta)
    }

    type ObjectParam<M extends ObjectParam<M>[]> = ObjectField<string, any> | Modifier<ObjectMeta<AsObject<M>>>

    type Filter<T, U> = T extends U ? T : never;
    type FilterArray<T, A> = T extends (infer U)[] ? Filter<U, A>[] : never

    type FilterFields<M extends ObjectParam<M>[]> = FilterArray<M, ObjectField<string, any>>

    type AsObject<M extends ObjectParam<M>[]> = Expand<{ [E in FilterFields<M>[number]as E['name']['value']]: E['value'] }>

    const object = <M extends ObjectParam<M>[]>(...args: M): ObjectMeta<AsObject<M>> => {
        const fields = args.filter((arg): arg is ObjectField<keyof AsObject<M> & string, any> => {
            return arg && typeof arg === 'object' && typeof arg['name'] === 'string' && isMetadata(arg.value)
        })

        const objectMeta: ObjectMeta<AsObject<M>> = {
            type: OBJECT,
            fields: fields,
            toValue: toObject,
            build: genObjectFactory<ObjectMeta<AsObject<M>>>(fields),
            getFieldIndex: generateTrie(fields.map(f => f.name.bytes)),
            toJson: genObjectToJsonFactory<ObjectMeta<AsObject<M>>>(fields)
        }

        return args
            .filter((arg): arg is Modifier<ObjectMeta<AsObject<M>>> => {
                return arg && typeof arg === 'function'
            })
            .reduce(applyModifier, objectMeta)
    }

    const field = <K extends string, M extends BaseMeta<any>>(name: K, value: M): ObjectField<K, M> => {
        return {
            name: {
                value: name,
                bytes: encoder.encode(name)
            },
            value: value
        }
    }

    return {
        string,
        number,
        bigInt,
        bool,
        date,
        nullable,
        i8, i16, i32, i64,
        u8, u16, u32, u64,
        array,
        i8Array, i16Array, i32Array, i64Array,
        u8Array, u16Array, u32Array, u64Array,
        f64Array,
        map, set,
        object,
        field,
    }
}

export const {
    string,
    number,
    bigInt,
    bool,
    date,
    nullable,
    i8, i16, i32, i64,
    u8, u16, u32, u64,
    array,
    i8Array, i16Array, i32Array, i64Array,
    u8Array, u16Array, u32Array, u64Array,
    f64Array,
    map, set,
    object,
    field,
} = builder()
