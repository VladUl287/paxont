import { toArray } from "../../src/converters/array"
import { toBoolean } from "../../src/converters/boolean"
import { toDate } from "../../src/converters/date"
import { toMap } from "../../src/converters/map"
import { toNullable } from "../../src/converters/nullable"
import { toBigInt, toInt64, toUint64 } from "../../src/converters/number/bigint"
import { toFloat } from "../../src/converters/number/float"
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from "../../src/converters/number/int"
import { toObject } from "../../src/converters/object"
import { toSet } from "../../src/converters/set"
import { toString } from "../../src/converters/string"
import { ARRAY, BIGINT, BOOL, DATE, F64_ARRAY, I16, I16_ARRAY, I32, I32_ARRAY, I64, I64_ARRAY, I8, I8_ARRAY, MAP, NULLABLE, NUMBER, OBJECT, SET, STRING, U16, U16_ARRAY, U32, U32_ARRAY, U64, U64_ARRAY, U8, U8_ARRAY, } from "../../src/metadata/baseTypes"
import { array, bigInt, bool, date, i16, i32, i64, i8, nullable, number, string, u16, u16Array, u32, u8, u8Array, u32Array, u64Array, i8Array, i16Array, i32Array, i64Array, f64Array, map, set, object, field, usePool } from "../../src/metadata/builder"
import { BaseMeta, TypeName } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { arrayPool } from "../../src/utils/array"

describe('metadata builders', () => {
    function expectBaseStructure<M extends BaseMeta<any>>(meta: M, type: TypeName) {
        expect(meta).toHaveProperty('type', type)
        expect(meta).toHaveProperty('toValue')
        expect(meta).toHaveProperty('toJson')

        expect(typeof meta.toValue).toBe('function')
        expect(meta.toValue.length).toBe(4)
        expect(typeof meta.toJson).toBe('function')
        expect(meta.toJson.length).toBe(3)
    }

    test('primitive number', () => {
        const meta = number()

        expectBaseStructure(meta, NUMBER)
        expect(meta.toValue).toBe(toFloat)
        expect(meta.toJson(meta, 1, defaultOptions)).toBe('1')
    })

    test('primitive string', () => {
        const meta = string()

        expectBaseStructure(meta, STRING)
        expect(meta.toValue).toBe(toString)
        expect(meta.toJson(meta, 'test', defaultOptions)).toBe('"test"')
    })

    test('primitive boolean', () => {
        const meta = bool()

        expectBaseStructure(meta, BOOL)
        expect(meta.toValue).toBe(toBoolean)
        expect(meta.toJson(meta, true, defaultOptions)).toBe('true')
    })

    test('primitive bigInt', () => {
        const meta = bigInt()

        expectBaseStructure(meta, BIGINT)
        expect(meta.toValue).toBe(toBigInt)
        expect(meta.toJson(meta, 1n, defaultOptions)).toBe('1')
    })

    test('primitive date', () => {
        const meta = date()

        expectBaseStructure(meta, DATE)
        const d = new Date()
        expect(meta.toValue).toBe(toDate)
        expect(meta.toJson(meta, d, defaultOptions)).toBe(`"${d.toISOString()}"`)
    })

    test('uint8', () => {
        const meta = u8()

        expectBaseStructure(meta, U8)
        expect(meta.toValue).toBe(toUint8)
        expect(meta.toJson(meta, 123, defaultOptions)).toBe('123')
    })

    test('uint16', () => {
        const meta = u16()

        expectBaseStructure(meta, U16)
        expect(meta.toValue).toBe(toUint16)
        expect(meta.toJson(meta, 123456, defaultOptions)).toBe('123456')
    })

    test('uint32', () => {
        const meta = u32()

        expectBaseStructure(meta, U32)
        expect(meta.toValue).toBe(toUint32)
        expect(meta.toJson(meta, 123456789, defaultOptions)).toBe('123456789')
    })

    test('int8', () => {
        const meta = i8()

        expectBaseStructure(meta, I8)
        expect(meta.toValue).toBe(toInt8)
        expect(meta.toJson(meta, 123, defaultOptions)).toBe('123')
    })

    test('int16', () => {
        const meta = i16()

        expectBaseStructure(meta, I16)
        expect(meta.toValue).toBe(toInt16)
        expect(meta.toJson(meta, 123456, defaultOptions)).toBe('123456')
    })

    test('int32', () => {
        const meta = i32()

        expectBaseStructure(meta, I32)
        expect(meta.toValue).toBe(toInt32)
        expect(meta.toJson(meta, 123456789, defaultOptions)).toBe('123456789')
    })

    test('int64', () => {
        const meta = i64()

        expectBaseStructure(meta, I64)
        expect(meta.toValue).toBe(toInt64)
        expect(meta.toJson(meta, 1234567891234567n, defaultOptions)).toBe('1234567891234567')
    })

    test('nullable', () => {
        const num = number()
        const meta = nullable(num)

        expectBaseStructure(meta, NULLABLE)
        expect(meta).toHaveProperty('value', num)
        expect(meta.toValue).toBe(toNullable)
        expect(meta.toJson(meta, null, defaultOptions)).toBe('null')
        expect(meta.toJson(meta, 1, defaultOptions)).toBe('1')
    })

    test('array', () => {
        const num = number()
        const pool = arrayPool<Array<number>>(Array)
        const addPool = usePool(pool)
        const meta = array(num, addPool)

        expectBaseStructure(meta, ARRAY)
        expect(meta).toHaveProperty('value', num)
        expect(meta).toHaveProperty('pool', pool)
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, [1], defaultOptions)).toBe('[1]')
    })

    test('u8array', () => {
        const meta = u8Array()

        expectBaseStructure(meta, U8_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: U8,
            toJson: expect.any(Function),
            toValue: toUint8
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Uint8Array([1]), defaultOptions)).toBe('[1]')
    })

    test('u16array', () => {
        const meta = u16Array()

        expectBaseStructure(meta, U16_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: U16,
            toJson: expect.any(Function),
            toValue: toUint16
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Uint16Array([1]), defaultOptions)).toBe('[1]')
    })

    test('u32array', () => {
        const meta = u32Array()

        expectBaseStructure(meta, U32_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: U32,
            toJson: expect.any(Function),
            toValue: toUint32
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Uint32Array([1]), defaultOptions)).toBe('[1]')
    })

    test('u64array', () => {
        const meta = u64Array()

        expectBaseStructure(meta, U64_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: U64,
            toJson: expect.any(Function),
            toValue: toUint64
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new BigUint64Array([1n]), defaultOptions)).toBe('[1]')
    })

    test('i8array', () => {
        const meta = i8Array()

        expectBaseStructure(meta, I8_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: I8,
            toJson: expect.any(Function),
            toValue: toInt8
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Int8Array([1]), defaultOptions)).toBe('[1]')
    })

    test('i16array', () => {
        const meta = i16Array()

        expectBaseStructure(meta, I16_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: I16,
            toJson: expect.any(Function),
            toValue: toInt16
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Int16Array([1]), defaultOptions)).toBe('[1]')
    })

    test('i32array', () => {
        const meta = i32Array()

        expectBaseStructure(meta, I32_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: I32,
            toJson: expect.any(Function),
            toValue: toInt32
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Int32Array([1]), defaultOptions)).toBe('[1]')
    })

    test('i64array', () => {
        const meta = i64Array()

        expectBaseStructure(meta, I64_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: I64,
            toJson: expect.any(Function),
            toValue: toInt64
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new BigInt64Array([1n]), defaultOptions)).toBe('[1]')
    })

    test('f64array', () => {
        const meta = f64Array()

        expectBaseStructure(meta, F64_ARRAY)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: NUMBER,
            toJson: expect.any(Function),
            toValue: toFloat
        })
        expect(meta).toHaveProperty('pool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Float64Array([1.1]), defaultOptions)).toBe('[1.1]')
    })

    test('map', () => {
        const meta = map(number())

        expectBaseStructure(meta, MAP)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: NUMBER,
            toJson: expect.any(Function),
            toValue: toFloat
        })
        expect(meta.toValue).toBe(toMap)
        expect(meta.toJson(meta, new Map([['first', 1]]), defaultOptions)).toBe('{"first":1}')
    })

    test('set', () => {
        const meta = set(number())

        expectBaseStructure(meta, SET)
        expect(meta).toHaveProperty('value')
        expect(meta.value).toMatchObject({
            type: NUMBER,
            toJson: expect.any(Function),
            toValue: toFloat
        })
        expect(meta.toValue).toBe(toSet)
        expect(meta.toJson(meta, new Set([1, 1, 2]), defaultOptions)).toBe('[1,2]')
    })

    test('field', () => {
        const meta = field('id', number())

        expectBaseStructure(meta.value, NUMBER)
        expect(meta).toHaveProperty('name', {
            value: 'id',
            bytes: new TextEncoder().encode('id'),
        })
    })

    test('object', () => {
        const fields = [field('id', number()), field('name', string())]
        const meta = object(...fields)

        expectBaseStructure(meta, OBJECT)
        expect(meta).toHaveProperty('fields')
        expect(meta.fields).toStrictEqual(fields)
        expect(meta.toValue).toBe(toObject)
        expect(meta.toJson(meta, { id: 1, name: 'test' } as any, defaultOptions)).toBe('{"id":1,"name":"test"}')
        expect(meta).toHaveProperty('build')
        expect(meta.build([1, "test"] as any)).toStrictEqual({ id: 1, name: "test" })
        expect(meta).toHaveProperty('getFieldIndex')
        expect(meta.getFieldIndex(new TextEncoder().encode("id"), 0)).toBe(0)
        expect(meta.getFieldIndex(new TextEncoder().encode("name"), 0)).toBe(1)
    })
})