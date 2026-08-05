import { toObject } from "../../src/converters/object"
import { bool, field, number, object } from "../../src/metadata/builder"
import { ParseState, ObjectMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"
import { deserializePartially } from "./utils"

describe('toNullable', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const _meta = object(
        field("id", number()),
        field("isActive", bool())
    )

    const deserialize = (bytes: Uint8Array, meta: ObjectMeta<any> = _meta) => {
        const result = toObject(meta, {
            options: defaultOptions,
            reader: {
                bytes,
                writable: false
            },
            stack: new Stack<ParseState>(),
        }, 0, 0)
        return result
    }

    describe('basic parsing', () => {
        test('should parse simple object', () => {
            const input = { id: 1, isActive: false }
            const bytes = toBytes(JSON.stringify(input))
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: bytes.length })
        })

        test('should parse empty object', () => {
            const input = {}
            const bytes = toBytes(JSON.stringify(input))
            const result = deserialize(bytes, object())
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: bytes.length })
        })
    })

    describe('error handling', () => {
        test('should throw error if more data presented', () => {
            const input = { id: 1, isActive: false }
            const bytes = toBytes(JSON.stringify(input))
            const meta = object(field("id", number()))
            const result = deserialize(bytes, meta)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error if data not presented', () => {
            const input = { id: 1 }
            const bytes = toBytes(JSON.stringify(input))
            const result = deserialize(bytes, _meta)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('partial parsing', () => {
        test('should parse partial all over object', () => {
            const input = { id: 1, isActive: false }
            const str = JSON.stringify(input)

            for (let i = 0; i < str.length; i++) {
                const chunks = [
                    toBytes(str.substring(0, i)),
                    toBytes(str.substring(i))
                ].reverse()

                const result = deserializePartially(_meta, chunks)
                const lastChunk = chunks[0]

                expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: lastChunk.length })
            }
        })
    })
})