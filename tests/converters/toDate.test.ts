import { toDate } from "../../src/converters/toValue/date"
import { date } from "../../src/metadata/builder"
import { JsonParsingContext, BaseMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { isComplete, ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { deserializePartially } from "./utils"
import dayjs from 'dayjs'

describe('toDate', () => {
    function toBytes(str: string) { return new TextEncoder().encode(str) }

    function callToDate(bytes: Uint8Array, i: number) {
        const meta: any = {}
        const reader = new JsonReader(bytes, bytes.length, false)
        const ctx: JsonParsingContext = { reader: reader, options: defaultOptions, stack: new Stack() }
        return toDate(meta, ctx, i, 0)
    }

    const meta = date()

    function expectDate<M extends BaseMeta<Date>>(meta: M, str: string) {
        const expectedResult = dayjs(str.substring(1, str.length - 1))
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }
        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Date), nextIndex: bytes.length })

        if (isComplete(result)) {
            expect(result.value.toISOString()).toEqual(expectedResult.toISOString())
        }

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Date), nextIndex: chunks[0].length })

            if (isComplete(result)) {
                expect(result.value.toISOString()).toEqual(expectedResult.toISOString())
            }
        }
    }

    describe('valid ISO date formats', () => {
        test('should parse basic ISO date (YYYY-MM-DD) - local time', () => {
            expectDate(meta, '"2024-01-15"')
        })

        test('should parse ISO date with time (YYYY-MM-DDThh:mm:ss) - local time', () => {
            expectDate(meta, '"2024-03-20T14:30:45"')
        })

        test('should parse ISO date with milliseconds - UTC', () => {
            expectDate(meta, '"2024-06-10T09:15:30.123Z"')
        })

        test('should parse ISO date with timezone offset - UTC', () => {
            expectDate(meta, '"2024-12-25T10:00:00+05:30"')
        })

        test('should parse UTC ISO date with Z suffix', () => {
            expectDate(meta, '"2024-07-04T12:00:00Z"')
        })

        test('should parse ISO date with time and timezone offset - UTC', () => {
            expectDate(meta, '"2024-01-15T08:30:00-08:00"')
        })

        test('should parse RFC 2822 date', () => {
            expectDate(meta, '"Mon, 15 Jan 2024 10:30:00 GMT"')
        })

        test('should parse earliest ISO date - UTC', () => {
            expectDate(meta, '"0001-01-01T00:00:00Z"')
        })

        test('should parse far future date - UTC', () => {
            expectDate(meta, '"9999-12-31T23:59:59Z"')
        })

        test('should handle midnight (00:00:00) - local time', () => {
            expectDate(meta, '"2024-01-01T00:00:00"')
        })

        test('should handle midnight UTC', () => {
            expectDate(meta, '"2024-01-01T00:00:00Z"')
        })

        test('should handle UTC+0 timezone', () => {
            expectDate(meta, '"2024-08-15T15:30:00+00:00"')
        })

        test('should handle negative timezone offset', () => {
            expectDate(meta, '"2024-08-15T15:30:00-03:00"')
        })

        test('should handle timezone offset with minutes', () => {
            expectDate(meta, '"2024-08-15T15:30:00+05:45"')
        })

        test('should handle non-existent date (2024-04-31) by rolling over to next month', () => {
            expectDate(meta, '"2024-04-31"')
        })
    })

    describe('invalid inputs', () => {
        test('should throw error for invalid date format', () => {
            const bytes = toBytes('"2024-13-45"')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for completely invalid string', () => {
            const bytes = toBytes('not a date')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for empty Uint8Array', () => {
            const bytes = new Uint8Array([])

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for invalid month (13)', () => {
            const bytes = toBytes('"2024-13-01"')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for invalid day (32)', () => {
            const bytes = toBytes('"2024-01-32"')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })
})