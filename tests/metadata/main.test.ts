import { toObject } from "../../src/converters/object"
import { metadata } from "../../src/metadata"
import { JSONT } from "../../src/metadata/baseTypes"
import { Int16, Int32, Int64, Int8, Nullable, Uint16, Uint32, Uint64, Uint8 } from "../../src/metadata/type-containers"
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

        const meta = metaBuilder.from(object) as ObjectMeta<any>

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

    test('full typed object', () => {
        const typeObject = {
            id: new Int32(),
            status: new Int8(),
            symbol: new Int16(),
            number: new Int64(),

            category: new Uint8(),
            symbol_add: new Uint16(),
            userId: new Uint32(),
            hash: new Uint64(),

            coefficient: 124.4,
            name: "name",
            isActive: true,
            isAlive: false,

            createdAt: new Date(),

            bytes: new Uint8Array(),
            bytesUTF16: new Uint16Array(),

            postsIds: new Uint32Array(),
            numbers: new BigUint64Array(),

            tests: new Int8Array(),
            tests1: new Int16Array(),
            tests2: new Int32Array(),
            tests3: new BigInt64Array(),

            sequence: 1n,

            address: new Nullable({
                index: 12345,
                name: "name"
            }),
            coordinates: [
                { x: 1.23, y: 35.4 },
                { x: 1.23, y: 65.2 },
                { x: 1.23, y: 87.1 },
            ],
            urls: new Map<string, number>([
                ["https://dummyimage.com", 0],
                ["https://dummyimage.com/200x200", 1]
            ]),
            images: new Set(["https://dummyimage.com/200x200/FFFFFF/lorem-ipsum.png&text=jsonplaceholder.org", "https://dummyimage.com/200x200/FFFFFF/lorem-ipsum.png&text=jsonplaceholder.org"])
        }


        const meta = metaBuilder.from(typeObject) as ObjectMeta<any>

        expectBaseStructure(meta, JSONT.OBJECT)

        expect(meta).toHaveProperty('fields')
        expect(meta).toHaveProperty('build')
        expect(meta).toHaveProperty('getFieldIndex')
        expect(meta.toValue).toBe(toObject)

        const toBytes = (str: string) => new TextEncoder().encode(str)

        const object = {
            id: 123,
            status: 2,
            symbol: 123,
            number: 32434534534,

            category: 1,
            symbol_add: 453,
            userId: 23,
            hash: 33453453465,

            coefficient: 124.4,
            name: "name",
            isActive: true,
            isAlive: false,

            createdAt: new Date(),

            bytes: new Uint8Array(),
            bytesUTF16: new Uint16Array(),

            postsIds: new Uint32Array(),
            numbers: new BigUint64Array(),

            tests: new Int8Array(),
            tests1: new Int16Array(),
            tests2: new Int32Array(),
            tests3: new BigInt64Array(),

            sequence: 1n,

            address: {
                index: 12345,
                name: "name"
            },
            coordinates: [
                { x: 1.23, y: 35.4 },
                { x: 1.23, y: 65.2 },
                { x: 1.23, y: 87.1 },
            ],
            urls: new Map<string, number>([
                ["https://dummyimage.com", 0],
                ["https://dummyimage.com/200x200", 1]
            ]),
            images: new Set(["https://dummyimage.com/200x200/FFFFFF/lorem-ipsum.png&text=jsonplaceholder.org", "https://dummyimage.com/200x200/FFFFFF/lorem-ipsum.png&text=jsonplaceholder.org"])
        }

        // expect(meta.toJson(meta, object, defaultOptions)).toBe(JSON.stringify(object))

        const ctx: ParseContext = {
            reader: {
                bytes: toBytes(meta.toJson(meta, object, defaultOptions)),
                writable: false
            },
            options: defaultOptions,
            stack: new Stack()
        }
        expect(meta.toValue(meta, ctx, 0, 0)).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: object,
            nextIndex: ctx.reader.bytes.length
        })
    })
})