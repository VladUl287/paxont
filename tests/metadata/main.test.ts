import { toObject } from "../../src/converters/object"
import { metadata } from "../../src/metadata"
import { JSONT } from "../../src/metadata/baseTypes"
import { BaseMeta, ObjectMeta, ParseContext, TypeName } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"

describe('metadata', () => {
    const metaBuilder = metadata()

    function expectBaseStructure<M extends BaseMeta<any, any>>(meta: M, type: TypeName) {
        expect(meta).toHaveProperty('type', type)
        expect(meta).toHaveProperty('toValue')
        expect(meta).toHaveProperty('toJson')

        expect(typeof meta.toValue).toBe('function')
        expect(meta.toValue.length).toBe(4)
        expect(typeof meta.toJson).toBe('function')
        expect(meta.toJson.length).toBe(3)
    }

    test('base object', () => {
        const object = {
            id: 1,
            name: "name",
            isActive: true,
            isAlive: false,
            address: {
                index: 12345,
                name: "name"
            },
            coordinates: [
                { x: 1.23, y: 35.4 },
                { x: 1.23, y: 65.2 },
                { x: 1.23, y: 87.1 },
            ]
        }

        const meta = metaBuilder.toMetadata(object) as ObjectMeta<any>

        expectBaseStructure(meta, JSONT.OBJECT)

        expect(meta).toHaveProperty('fields')

        expect(meta.toJson(meta, object, defaultOptions)).toBe(JSON.stringify(object))

        expect(meta).toHaveProperty('build')
        const buildResult = meta.build([2, "test", false, true, { index: 0, name: "0" }, []])
        expect(buildResult).toStrictEqual({
            id: 2,
            name: "test",
            isActive: false,
            isAlive: true,
            address: { index: 0, name: "0" },
            coordinates: []
        })

        expect(meta).toHaveProperty('getFieldIndex')
        const toBytes = (str: string) => new TextEncoder().encode(str)
        expect(meta.getFieldIndex(toBytes("id"), 0)).toBe(0)
        expect(meta.getFieldIndex(toBytes("name"), 0)).toBe(1)
        expect(meta.getFieldIndex(toBytes("isActive"), 0)).toBe(2)
        expect(meta.getFieldIndex(toBytes("isAlive"), 0)).toBe(3)
        expect(meta.getFieldIndex(toBytes("address"), 0)).toBe(4)
        expect(meta.getFieldIndex(toBytes("coordinates"), 0)).toBe(5)

        expect(meta.toValue).toBe(toObject)
        const ctx: ParseContext = { 
            reader: {
                bytes: toBytes(JSON.stringify(object)),
                writable: false
            },
            options: defaultOptions,
            stack: new Stack()
        } 
        const value = meta.toValue(meta, ctx, 0, 0)
        expect(value).toStrictEqual({ type: ReadResultType.COMPLETE, value: object, nextIndex: ctx.reader.bytes.length })
    })
})