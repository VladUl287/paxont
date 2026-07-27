import { toMap } from "../../src/converters/map"
import { bool, map } from "../../src/metadata/builder"
import { ConvertState, ParseContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { isNeedsMoreData, ReadResultType } from "../../src/utils/types"

describe('toMap', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const meta = map(bool())

    const deserialize = (bytes: Uint8Array) => {
        const result = toMap(meta, {
            options: defaultOptions,
            reader: {
                bytes,
                writable: false
            },
            stack: new Stack<ConvertState>(),
        }, 0, 0)
        return result
    }

    const deserializePartially = (chunks: Uint8Array[]) => {
        let result
        let index = 0

        let currentChunk
        let prevChunk: number[] = []

        const stack = new Stack<ConvertState>()

        while ((currentChunk = chunks.pop()) !== undefined) {
            const context: ParseContext = {
                reader: {
                    bytes: new Uint8Array([...prevChunk, ...currentChunk]),
                    writable: chunks.length !== 0
                },
                options: defaultOptions,
                stack: stack
            }
            result = toMap(meta, context, index, 0)

            if (isNeedsMoreData(result)) {
                index = result.nextIndex
                prevChunk = [...currentChunk.slice(result.nextIndex)]
                continue
            }

            return result
        }
    }

    describe('Basic parsing with UTF-8 bytes', () => {
        test('should parse simple JSON object to Map', () => {
            const bytes = new TextEncoder().encode('{"name":false,"age":true,"city":true}')
            const result = deserialize(bytes)

            expect(result.type).toBe(ReadResultType.COMPLETE)
            const value = (result as any).value as Map<string, boolean>
            expect(value).toBeInstanceOf(Map)
            expect(value.get('name')).toBe(false)
            expect(value.get('age')).toBe(true)
            expect(value.get('city')).toBe(true)
            expect(value.size).toBe(3)
        })

        test('should handle empty objects', () => {
            const bytes = new TextEncoder().encode('{}')
            const result = deserialize(bytes)

            expect(result.type).toBe(ReadResultType.COMPLETE)

            const value = (result as any).value as Map<string, boolean>
            expect(value).toBeInstanceOf(Map)
            expect(value.size).toBe(0)
        })
    })

    describe('Error handling', () => {
        test('should throw error for invalid JSON', () => {
            const bytes = new TextEncoder().encode('{"name":true,"age":false,}')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for non-object/non-array input', () => {
            const bytes = new TextEncoder().encode('"just a string"')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for null input', () => {
            const bytes = new TextEncoder().encode('null')
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for malformed UTF-8', () => {
            const bytes = new Uint8Array([0x80])
            const result = deserialize(bytes)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('Partial parsing', () => {
        test('should parse partial data', () => {
            const chunks = [toBytes('{"name":true,"age"'), toBytes(':false,"city":false}')].reverse()

            const result = deserializePartially(chunks)!

            expect(result).not.toBeUndefined()
            expect(result.type).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Map), nextIndex: 15 })

            const value = (result as any).value as Map<string, boolean>
            expect(value.get('name')).toBe(true)
            expect(value.get('age')).toBe(false)
            expect(value.get('city')).toBe(false)
        })

        test('should handle chunks with complete objects in writable mode', () => {
            const chunks = [toBytes('{"name":true,"age":false,"city":false}')]

            const result = deserializePartially(chunks)!

            expect(result).not.toBeUndefined()
            expect(result.type).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Map), nextIndex: 21 })

            const value = (result as any).value as Map<string, boolean>
            expect(value.get('name')).toBe(true)
            expect(value.get('age')).toBe(false)
            expect(value.get('city')).toBe(false)
        })
    })

    describe('Edge cases', () => {
        test('should handle special characters in keys', () => {
            const jsonStr = '{"key with spaces":true,"key-with-dash":false,"key_with_underscore":true}'
            const bytes = new TextEncoder().encode(jsonStr)

            const result = deserialize(bytes)

            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Map), nextIndex: 24 })

            const value = (result as any).value as Map<string, boolean>
            expect(value.get('key with spaces')).toBe(true)
            expect(value.get('key-with-dash')).toBe(false)
            expect(value.get('key_with_underscore')).toBe(true)
        })
    })
})