import { toNullable } from "../../src/converters/nullable"
import { toObject } from "../../src/converters/object"
import { bool, field, nullable, number, object, set } from "../../src/metadata/builder"
import { BaseMeta, ParseState, ObjectMeta, ParseContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { isNeedsMoreData, ReadResultType } from "../../src/utils/types"

describe('toSet', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const setMeta = set(number())

    const deserialize = <M extends BaseMeta<any, any>>(bytes: Uint8Array, meta: M) => {
        const result = meta.toValue(meta, {
            options: defaultOptions,
            reader: {
                bytes,
                writable: false
            },
            stack: new Stack<ParseState>(),
        }, 0, 0)
        return result
    }

    const deserializePartially = <M extends BaseMeta<any, any>>(chunks: Uint8Array[], meta: M) => {
        let result

        let currentChunk
        let prevChunk: number[] = []

        const stack = new Stack<ParseState>()

        while ((currentChunk = chunks.pop()) !== undefined) {
            const ch = [...prevChunk, ...currentChunk]
            const bytes = new Uint8Array(ch)

            const context: ParseContext = {
                reader: {
                    bytes: bytes,
                    writable: chunks.length !== 0
                },
                options: defaultOptions,
                stack: stack
            }
            result = meta.toValue(meta, context, 0, 0)

            if (isNeedsMoreData(result)) {
                prevChunk = [...currentChunk.slice(result.nextIndex)]
                continue
            }

            chunks[0] = bytes
            return result
        }
    }

    describe('basic parsing', () => {
        test('should parse simple set', () => {
            const arr = [1, 2, 3]
            const input = new Set(arr)
            const bytes = toBytes(JSON.stringify(arr))
            const result = deserialize(bytes, setMeta)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: bytes.length })
        })

        test('should parse empty set', () => {
            const arr: number[] = []
            const input = new Set(arr)
            const bytes = toBytes(JSON.stringify(arr))
            const result = deserialize(bytes, setMeta)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: bytes.length })
        })
    })

    describe('error handling', () => {
        test('should throw error if invalid data presented', () => {
            const input = { id: 1, isActive: false }
            const bytes = toBytes(JSON.stringify(input))
            const result = deserialize(bytes, setMeta)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error if data presented partially', () => {
            const arr: number[] = []
            const input = new Set(arr)
            const bytes = toBytes(JSON.stringify(arr).replace(']', ''))
            const result = deserialize(bytes, setMeta)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error if data not presented', () => {
            const result = deserialize(new Uint8Array(), setMeta)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('partial parsing', () => {
        test('should parse partial all over object', () => {
            const arr = [1, 2, 3, 4, 5, 6, 7, 8]
            const input = new Set(arr)
            const str = JSON.stringify(arr)

            for (let i = 0; i < str.length; i++) {
                const chunks = [
                    toBytes(str.substring(0, i)),
                    toBytes(str.substring(i))
                ].reverse()

                const result = deserializePartially(chunks, setMeta)
                const lastChunk = chunks[0]

                expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: input, nextIndex: lastChunk.length })
            }
        })
    })
})