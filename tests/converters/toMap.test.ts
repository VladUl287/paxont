import { bool, map } from "../../src/metadata/builder"
import { JsonParsingContext, MapMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { isComplete, ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
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

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expect.any(Map),
            nextIndex: bytes.length
        })

        if (isComplete(result)) {
            expect(mapToString(result.value)).toEqual(str)
        }

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            try {
                expect(result).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: expect.any(Map),
                    nextIndex: chunks[0].length
                })

                if (isComplete(result)) {
                    expect(mapToString(result.value)).toEqual(str)
                }
            } catch (error) {
                console.log('error on:', i)
                throw error
            }
        }
    }

    function expectError(meta: MapMeta<any>, str: string) {
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)
        expect(result).toStrictEqual({
            type: ReadResultType.ERROR,
            error: expect.any(JSONParseError)
        })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)
            try {
                expect(result).toStrictEqual({
                    type: ReadResultType.ERROR,
                    error: expect.any(JSONParseError)
                })
            } catch (error) {
                console.log('error on: ', i)
                throw error
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