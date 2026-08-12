import { toObject } from "../../src/converters/object"
import { metadata } from "../../src/metadata"
import { OBJECT } from "../../src/metadata/baseTypes"
import { field, object, i16, i32, i64, i8, number, u16, u32, u64, u8, string } from "../../src/metadata/builder"
import { BaseMeta, ObjectMeta, JsonParsingContext, TypeName } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"

describe('metadata', () => {
    const metaBuilder = metadata()

    function expectBaseStructure<M extends BaseMeta<any>>(meta: M, type: TypeName) {
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

        expectBaseStructure(meta, OBJECT)

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
        const ctx: JsonParsingContext = {
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
            id: i32(),
            status: i8(),
            symbol: i16(),
            number: i64(),

            category: u8(),
            symbol_add: u16(),
            userId: u32(),
            hash: u64(),

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

            addresses: new Array(object(
                field('index', number()),
                field('name', string())
            )),
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


        const meta = metaBuilder.from(typeObject)

        expectBaseStructure(meta, OBJECT)

        expect(meta).toHaveProperty('fields')
        expect(meta).toHaveProperty('build')
        expect(meta).toHaveProperty('getFieldIndex')
        expect(meta.toValue).toBe(toObject)

        const toBytes = (str: string) => new TextEncoder().encode(str)

        const obj = {
            id: 123,
            status: 2,
            symbol: 123,
            number: 32434534534n,

            category: 1,
            symbol_add: 453,
            userId: 23,
            hash: 33453453465n,

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

            addresses: new Array({
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

        // expect(meta.toJson(meta, object, defaultOptions)).toBe(JSON.stringify(object))

        const ctx: JsonParsingContext = {
            reader: {
                bytes: toBytes(meta.toJson(meta, obj, defaultOptions)),
                writable: false
            },
            options: defaultOptions,
            stack: new Stack()
        }
        expect(meta.toValue(meta, ctx, 0, 0)).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: obj,
            nextIndex: ctx.reader.bytes.length
        })
    })
})