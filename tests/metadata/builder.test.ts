import { toArray } from "../../src/converters/array"
import { toBoolean } from "../../src/converters/boolean"
import { toDate } from "../../src/converters/date"
import { toNullable } from "../../src/converters/nullable"
import { toBigInt, toInt64, toUint64 } from "../../src/converters/number/bigint"
import { toFloat } from "../../src/converters/number/float"
import { toInt16, toInt32, toInt8, toUint16, toUint32, toUint8 } from "../../src/converters/number/int"
import { toString } from "../../src/converters/string"
import { JSONT } from "../../src/metadata/baseTypes"
import { array, arrayPool, bigInt, bool, date, i16, i32, i64, i8, nullable, number, string, u16, u16Array, u32, u8, u8Array } from "../../src/metadata/builder"
import { BaseMeta, TypeName } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { useArrayPool } from "../../src/utils/array"

describe('metadata builders', () => {
    function expectBaseStructure<M extends BaseMeta<any, any>>(meta: M, type: TypeName) {
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

        expectBaseStructure(meta, JSONT.NUMBER)
        expect(meta.toValue).toBe(toFloat)
        expect(meta.toJson(meta, 1, defaultOptions)).toBe('1')
    })

    test('primitive string', () => {
        const meta = string()

        expectBaseStructure(meta, JSONT.STRING)
        expect(meta.toValue).toBe(toString)
        expect(meta.toJson(meta, 'test', defaultOptions)).toBe('"test"')
    })

    test('primitive boolean', () => {
        const meta = bool()

        expectBaseStructure(meta, JSONT.BOOL)
        expect(meta.toValue).toBe(toBoolean)
        expect(meta.toJson(meta, true, defaultOptions)).toBe('true')
    })

    test('primitive bigInt', () => {
        const meta = bigInt()

        expectBaseStructure(meta, JSONT.BIGINT)
        expect(meta.toValue).toBe(toBigInt)
        expect(meta.toJson(meta, 1n, defaultOptions)).toBe('1')
    })

    test('primitive date', () => {
        const meta = date()

        expectBaseStructure(meta, JSONT.DATE)
        const d = new Date()
        expect(meta.toValue).toBe(toDate)
        expect(meta.toJson(meta, d, defaultOptions)).toBe(`"${d.toISOString()}"`)
    })

    test('uint8', () => {
        const meta = u8()

        expectBaseStructure(meta, JSONT.U8)
        expect(meta.toValue).toBe(toUint8)
        expect(meta.toJson(meta, 123, defaultOptions)).toBe('123')
    })

    test('uint16', () => {
        const meta = u16()

        expectBaseStructure(meta, JSONT.U16)
        expect(meta.toValue).toBe(toUint16)
        expect(meta.toJson(meta, 123456, defaultOptions)).toBe('123456')
    })

    test('uint32', () => {
        const meta = u32()

        expectBaseStructure(meta, JSONT.U32)
        expect(meta.toValue).toBe(toUint32)
        expect(meta.toJson(meta, 123456789, defaultOptions)).toBe('123456789')
    })

    test('int8', () => {
        const meta = i8()

        expectBaseStructure(meta, JSONT.I8)
        expect(meta.toValue).toBe(toInt8)
        expect(meta.toJson(meta, 123, defaultOptions)).toBe('123')
    })

    test('int16', () => {
        const meta = i16()

        expectBaseStructure(meta, JSONT.I16)
        expect(meta.toValue).toBe(toInt16)
        expect(meta.toJson(meta, 123456, defaultOptions)).toBe('123456')
    })

    test('int32', () => {
        const meta = i32()

        expectBaseStructure(meta, JSONT.I32)
        expect(meta.toValue).toBe(toInt32)
        expect(meta.toJson(meta, 123456789, defaultOptions)).toBe('123456789')
    })

    test('int64', () => {
        const meta = i64()

        expectBaseStructure(meta, JSONT.I64)
        expect(meta.toValue).toBe(toInt64)
        expect(meta.toJson(meta, 1234567891234567n, defaultOptions)).toBe('1234567891234567')
    })

    test('nullable', () => {
        const num = number()
        const meta = nullable(num)

        expectBaseStructure(meta, JSONT.NULLABLE)
        expect(meta).toHaveProperty('value', num)
        expect(meta.toValue).toBe(toNullable)
        expect(meta.toJson(meta, null, defaultOptions)).toBe('null')
        expect(meta.toJson(meta, 1, defaultOptions)).toBe('1')
    })

    test('array', () => {
        const num = number()
        const meta = array(num)

        expectBaseStructure(meta, JSONT.ARRAY)
        expect(meta).toHaveProperty('value', num)
        expect(meta).toHaveProperty('arrayPool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, [1], defaultOptions)).toBe('[1]')
    })

    test('u8array', () => {
        const meta = u8Array()

        expectBaseStructure(meta, JSONT.U8_ARRAY)
        expect(meta).toHaveProperty('value', u8())
        expect(meta).toHaveProperty('arrayPool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Uint8Array([1]), defaultOptions)).toBe('[1]')
    })

    test('u16array', () => {
        const meta = u16Array()

        expectBaseStructure(meta, JSONT.U16_ARRAY)
        expect(meta).toHaveProperty('value', u16())
        expect(meta).toHaveProperty('arrayPool')
        expect(meta.toValue).toBe(toArray)
        expect(meta.toJson(meta, new Uint16Array([1]), defaultOptions)).toBe('[1]')
    })
})