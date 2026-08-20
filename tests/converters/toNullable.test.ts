import { bool, nullable } from "../../src/metadata/builder"
import { JsonParsingContext, NullableMeta, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { deserializePartially } from "./utils"

describe('toNullable', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    const meta = nullable(bool())

    function expectNullable(meta: NullableMeta<PrimitiveMeta<boolean>>, str: string) {
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: JSON.parse(str),
            nextIndex: bytes.length
        })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: JSON.parse(str),
                nextIndex: chunks[0].length
            })
        }
    }

    function expectError(meta: NullableMeta<PrimitiveMeta<boolean>>, str: string) {
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
            expect(result).toStrictEqual({
                type: ReadResultType.ERROR,
                error: expect.any(JSONParseError)
            })
        }
    }

    describe('basic parsing', () => {
        test('should parse simple null', () => {
            expectNullable(meta, 'null')
        })

        test('should handle nullable value', () => {
            expectNullable(meta, 'false')
            expectNullable(meta, 'true')
        })
    })

    describe('error handling', () => {
        test('should throw error for invalid JSON', () => {
            expectError(meta, 'NULL')
        })

        test('should throw error for not enough data', () => {
            expectError(meta, 'NU')
        })

        test('should throw error for invalid value JSON', () => {
            expectError(meta, 'FALSE')
        })
    })
})