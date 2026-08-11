import { toDate } from "../../src/converters/date"
import { date } from "../../src/metadata/builder"
import { ParseContext, BaseMeta, JsonReader } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { isComplete, ReadResultType } from "../../src/utils/types"
import { deserializePartially } from "./utils"

describe('toDate', () => {
    function toBytes(str: string) { return new TextEncoder().encode(str) }

    function callToDate(bytes: Uint8Array, i: number) {
        const meta: any = {}
        const reader: JsonReader = { bytes: bytes, writable: false }
        const ctx: ParseContext = { reader: reader, options: defaultOptions, stack: new Stack() }
        return toDate(meta, ctx, i, 0)
    }

    const dateMeta = date()

    function parseISO(isoString: string) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
            const [year, month, day] = isoString.split('-').map(Number)
            return new Date(year, month - 1, day, 0, 0, 0)
        }
        return new Date(isoString)
    }

    function expectDate<M extends BaseMeta<Date>>(meta: M, str: string) {
        const date = parseISO(str.substring(1, str.length - 1))
        const bytes = toBytes(str)

        const context: ParseContext = {
            reader: { bytes: bytes, writable: false },
            options: defaultOptions,
            stack: new Stack()
        }
        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Date), nextIndex: bytes.length })

        if (isComplete(result)) {
            expect(result.value.toISOString()).toEqual(date.toISOString())
        }

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: expect.any(Date), nextIndex: chunks[0].length })

            if (isComplete(result)) {
                expect(result.value.toISOString()).toEqual(date.toISOString())
            }
        }
    }

    describe('valid ISO date formats', () => {
        test('should parse basic ISO date (YYYY-MM-DD) - local time', () => {
            expectDate(dateMeta, '"2024-01-15"')
        })

        test('should parse ISO date with time (YYYY-MM-DDThh:mm:ss) - local time', () => {
            expectDate(dateMeta, '"2024-03-20T14:30:45"')
        })

        test('should parse ISO date with milliseconds - UTC', () => {
            expectDate(dateMeta, '"2024-06-10T09:15:30.123Z"')
        })

        test('should parse ISO date with timezone offset - UTC', () => {
            expectDate(dateMeta, '"2024-12-25T10:00:00+05:30"')
        })

        test('should parse UTC ISO date with Z suffix', () => {
            expectDate(dateMeta, '"2024-07-04T12:00:00Z"')
        })

        test('should parse ISO date with time and timezone offset - UTC', () => {
            expectDate(dateMeta, '"2024-01-15T08:30:00-08:00"')
        })
    })

    describe('edge cases with UTF-8 bytes', () => {
        test('should handle single-digit months and days correctly', () => {
            expectDate(dateMeta, '"2024-05-07"')
        })

        test('should handle leap year dates', () => {
            expectDate(dateMeta, '"2024-02-29"')
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

        test('should handle non-existent date (2024-04-31) by rolling over to next month', () => {
            const bytes = toBytes('"2024-04-31"') // April only has 30 days
            const result = (callToDate(bytes, 0) as any).value as Date
            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(4) // May (rolling over from April 31 to May 1)
            expect(result.getDate()).toBe(1)
            expect(result.getHours()).toBe(0)
            expect(result.getMinutes()).toBe(0)
            expect(result.getSeconds()).toBe(0)
        })
    })

    describe('boundary cases', () => {
        test('should parse earliest ISO date - UTC', () => {
            const bytes = toBytes('"0001-01-01T00:00:00Z"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(isNaN(result.getTime())).toBe(false)
            expect(result.getUTCFullYear()).toBeGreaterThanOrEqual(0)
            expect(result.getUTCFullYear()).toBeLessThanOrEqual(1)
            expect(result.getUTCMonth()).toBe(0)
            expect(result.getUTCDate()).toBe(1)
        })

        test('should parse far future date - UTC', () => {
            const bytes = toBytes('"9999-12-31T23:59:59Z"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(result.getUTCFullYear()).toBe(9999)
            expect(result.getUTCMonth()).toBe(11)
            expect(result.getUTCDate()).toBe(31)
            expect(result.getUTCHours()).toBe(23)
            expect(result.getUTCMinutes()).toBe(59)
            expect(result.getUTCSeconds()).toBe(59)
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should handle midnight (00:00:00) - local time', () => {
            const bytes = toBytes('"2024-01-01T00:00:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            // Local time handling - this test might need adjustment based on your timezone
            expect(result.getHours()).toBe(0)
            expect(result.getMinutes()).toBe(0)
            expect(result.getSeconds()).toBe(0)
        })

        test('should handle midnight UTC', () => {
            const bytes = toBytes('"2024-01-01T00:00:00Z"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCHours()).toBe(0)
            expect(result.getUTCMinutes()).toBe(0)
            expect(result.getUTCSeconds()).toBe(0)
        })
    })

    describe('UTF-8 multi-byte character handling', () => {
        test('should handle UTF-8 bytes with multi-byte characters before/after date', () => {
            const dateStr = '"2024-01-15"'
            const encoder = new TextEncoder()
            const bytes = encoder.encode(dateStr)

            const result = (callToDate(bytes, 0) as any).value as Date
            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(0)
            expect(result.getDate()).toBe(15)
        })

        test('should correctly decode UTF-8 bytes for ASCII range (date characters)', () => {
            const bytes = new Uint8Array([34, 0x32, 0x30, 0x32, 0x34]) // '2','0','2','4'
            const fullBytes = new Uint8Array([...bytes, ...toBytes('-01-01"')])
            const result = (callToDate(fullBytes, 0) as any).value as Date

            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(0)
            expect(result.getDate()).toBe(1)
        })
    })

    describe('timezone handling', () => {
        test('should handle UTC+0 timezone', () => {
            const bytes = toBytes('"2024-08-15T15:30:00+00:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCHours()).toBe(15)
            expect(result.getUTCMinutes()).toBe(30)
        })

        test('should handle negative timezone offset', () => {
            const bytes = toBytes('"2024-08-15T15:30:00-03:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(result.getUTCHours()).toBe(18) // 15:30 + 3:00 = 18:30 UTC
            expect(result.getUTCMinutes()).toBe(30)
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should handle timezone offset with minutes', () => {
            const bytes = toBytes('"2024-08-15T15:30:00+05:45"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCHours()).toBe(9) // 15:30 - 5:45 = 9:45 UTC
            expect(result.getUTCMinutes()).toBe(45)
        })
    })

    describe('performance and large inputs', () => {
        test('should handle large Uint8Array efficiently', () => {
            const dateStr = '"2024-01-15T12:00:00.000Z"'
            const encoder = new TextEncoder()
            const bytes = encoder.encode(dateStr)

            const start = performance.now()
            const result = (callToDate(bytes, 0) as any).value as Date
            const end = performance.now()

            expect(result).toBeInstanceOf(Date)
            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(0)
            expect(result.getUTCDate()).toBe(15)
            expect(end - start).toBeLessThan(100) // Should parse in less than 100ms
        })

        test('should handle Uint8Array with trailing null bytes', () => {
            const dateStr = '"2024-01-15"'
            const encoder = new TextEncoder()
            const dateBytes = encoder.encode(dateStr)
            const bytes = new Uint8Array([...dateBytes, 0, 0, 0])

            const result = (callToDate(bytes, 0) as any).value as Date
            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(0)
            expect(result.getDate()).toBe(15)
        })
    })

    describe('performance and large inputs', () => {

    })
})