import { bool, field, number, object } from "../../src/metadata/builder"
import { ObjectMeta, JsonParsingContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"
import { deserializePartially } from "./utils"

describe('toNullable', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const meta = object(
        field("id", number()),
        field("isActive", bool())
    )

    function expectObject(meta: ObjectMeta<any>, str: string) {
        const bytes = toBytes(str)
        const obj = JSON.parse(str)

        const context: JsonParsingContext = {
            reader: { bytes: bytes, writable: false },
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: obj,
            nextIndex: bytes.length
        })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: obj,
                nextIndex: chunks[0].length
            })
        }
    }

    function expectError(meta: ObjectMeta<any>, str: string) {
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: { bytes: bytes, writable: false },
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        }
    }

    describe('basic parsing', () => {
        test('should parse simple object', () => {
            const input = { id: 1, isActive: false }
            expectObject(meta, JSON.stringify(input))
        })

        test('should parse empty object', () => {
            const input = {}
            const meta = object()
            expectObject(meta, JSON.stringify(input))
        })
    })

    describe('error handling', () => {
        test('should throw error if more data presented', () => {
            const meta = object(field("id", number()))
            const input = { id: 1, isActive: false }
            expectError(meta, JSON.stringify(input))
        })

        test('should throw error if data not presented', () => {
            const input = { id: 1 }
            expectError(meta, JSON.stringify(input))
        })

        test('should throw error on trailing comma', () => {
            const input = '{ "id": 1, }'
            const meta = object(field("id", number()))
            expectError(meta, input)
        })
    })
})