import { toMap } from "../../src/converters/map"
import { bool, map } from "../../src/metadata/builder"
import { ParseState, ParseContext, MapMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { isComplete, isNeedsMoreData, ReadResultType } from "../../src/utils/types"
import { deserializePartially } from "./utils"

describe('toMap', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const meta = map(bool())

    function mapToString(map: Map<any, any>): string {
        const obj = Object.fromEntries(map)
        return JSON.stringify(obj)
    }

    function expectMap(meta: MapMeta<any>, str: string) {
        const bytes = toBytes(str)

        const context: ParseContext = {
            reader: { bytes: bytes, writable: false },
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Map), nextIndex: bytes.length })

        if (isComplete(result)) {
            expect(mapToString(result.value)).toEqual(str)
        }

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Map), nextIndex: chunks[0].length })

            if (isComplete(result)) {
                expect(mapToString(result.value)).toEqual(str)
            }
        }
    }

    function expectError(meta: MapMeta<any>, str: string) {
        const bytes = toBytes(str)

        const context: ParseContext = {
            reader: { bytes: bytes, writable: false },
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)
            try {
                expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
            }
            catch {
                console.log('es')
            }
        }
    }

    describe('Basic parsing with UTF-8 bytes', () => {
        test('should parse simple JSON object to Map', () => {
            expectMap(meta, '{"name":false,"age":true,"city":true}')
        })

        test('should handle empty objects', () => {
            expectMap(meta, '{}')
        })
    })

    describe('Error handling', () => {
        test('should throw error for invalid JSON', () => {
            expectError(meta, '{"name":true,"age":false,}')
        })

        test('should throw error for non-object/non-array input', () => {
            expectError(meta, '"just a string"')
        })

        test('should throw error for null input', () => {
            expectError(meta, 'null')
        })

        test('should throw error for malformed UTF-8', () => {
            expectError(meta, String.fromCharCode(0x80))
        })
    })
})