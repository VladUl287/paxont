import { toNullable } from "../../src/converters/nullable"
import { bool, nullable } from "../../src/metadata/builder"
import { ParseState, ParseContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { isNeedsMoreData, ReadResultType } from "../../src/utils/types"

describe('toNullable', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const meta = nullable(bool())

    const deserialize = (bytes: Uint8Array) => {
        const result = toNullable(meta, {
            options: defaultOptions,
            reader: {
                bytes,
                writable: false
            },
            stack: new Stack<ParseState>(),
        }, 0, 0)
        return result
    }

    const deserializePartially = (chunks: Uint8Array[]) => {
        let result
        let index = 0

        let currentChunk
        let prevChunk: number[] = []

        const stack = new Stack<ParseState>()

        while ((currentChunk = chunks.pop()) !== undefined) {
            const context: ParseContext = {
                reader: {
                    bytes: new Uint8Array([...prevChunk, ...currentChunk]),
                    writable: chunks.length !== 0
                },
                options: defaultOptions,
                stack: stack
            }
            result = toNullable(meta, context, index, 0)

            if (isNeedsMoreData(result)) {
                index = result.nextIndex
                prevChunk = [...currentChunk.slice(result.nextIndex)]
                continue
            }

            return result
        }
    }

    describe('basic parsing', () => {
        test('should parse simple null', () => {
            const bytes = toBytes('null')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: null, nextIndex: bytes.length })
        })

        test('should handle nullable value', () => {
            const bytes = toBytes('false')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: bytes.length })
        })
    })

    describe('error handling', () => {
        test('should throw error for invalid JSON', () => {
            const bytes = toBytes('NULL')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for not enough data', () => {
            const bytes = toBytes('NU')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for invalid value JSON', () => {
            const bytes = toBytes('FALSE')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('partial parsing', () => {
        test('should parse partial null', () => {
            const chunks = [toBytes('nu'), toBytes('ll')].reverse()
            const fullLength = chunks.reduce((res, ch) => ch.length + res, 0)
            const result = deserializePartially(chunks)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: null, nextIndex: fullLength })
        })

        test('should parse partial nullable value', () => {
            const chunks = [toBytes('fal'), toBytes('se')].reverse()
            const fullLength = chunks.reduce((res, ch) => ch.length + res, 0)
            const result = deserializePartially(chunks)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: fullLength })
        })

        test('should throw error for invalid JSON', () => {
            const chunks = [toBytes('NU'), toBytes('LL')].reverse()
            const result = deserializePartially(chunks)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })
})