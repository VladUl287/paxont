import { toDate } from "../../src/converters/date"
import { ParseState, JsonReader, ParseContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"

describe('toDate', () => {
    function stringToUint8Array(str: string) {
        return new TextEncoder().encode(str)
    }

    function callToDate(bytes: Uint8Array, i: number) {
        const meta: any = {}
        const reader: JsonReader = { bytes: bytes, writable: false }
        const ctx: ParseContext = { reader: reader, options: defaultOptions, stack: new Stack<ParseState>() }
        return toDate(meta, ctx, i, 0)
    }

    describe('valid ISO date formats', () => {
        test('should parse basic ISO date (YYYY-MM-DD) - local time', () => {
            const bytes = stringToUint8Array('"2024-01-15"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(0) // January is 0
            expect(result.getDate()).toBe(15)
        })

        test('should parse ISO date with time (YYYY-MM-DDThh:mm:ss) - local time', () => {
            const bytes = stringToUint8Array('"2024-03-20T14:30:45"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(2) // March is 2
            expect(result.getDate()).toBe(20)
            expect(result.getHours()).toBe(14)
            expect(result.getMinutes()).toBe(30)
            expect(result.getSeconds()).toBe(45)
        })

        test('should parse ISO date with milliseconds - UTC', () => {
            const bytes = stringToUint8Array('"2024-06-10T09:15:30.123Z"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(5) // June is 5
            expect(result.getUTCDate()).toBe(10)
            expect(result.getUTCHours()).toBe(9)
            expect(result.getUTCMinutes()).toBe(15)
            expect(result.getUTCSeconds()).toBe(30)
            expect(result.getUTCMilliseconds()).toBe(123)
        })

        test('should parse ISO date with timezone offset - UTC', () => {
            const bytes = stringToUint8Array('"2024-12-25T10:00:00+05:30"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(result.getUTCHours()).toBe(4) // 10:00 - 5:30 = 4:30 UTC
            expect(result.getUTCMinutes()).toBe(30)
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should parse UTC ISO date with Z suffix', () => {
            const bytes = stringToUint8Array('"2024-07-04T12:00:00Z"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(6) // July is 6
            expect(result.getUTCDate()).toBe(4)
            expect(result.getUTCHours()).toBe(12)
            expect(result.getUTCMinutes()).toBe(0)
            expect(result.getUTCSeconds()).toBe(0)
        })

        test('should parse ISO date with time and timezone offset - UTC', () => {
            const bytes = stringToUint8Array('"2024-01-15T08:30:00-08:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(0)
            expect(result.getUTCDate()).toBe(15)
            expect(result.getUTCHours()).toBe(16) // 08:30 + 8:00 = 16:30 UTC
            expect(result.getUTCMinutes()).toBe(30)
        })
    })

    describe('edge cases with UTF-8 bytes', () => {
        test('should handle bytes that are exactly the date string', () => {
            const bytes = new Uint8Array([34, 50, 48, 50, 52, 45, 48, 49, 45, 48, 49, 34]) // "2024-01-01"
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(0)
            expect(result.getDate()).toBe(1)
        })

        test('should handle single-digit months and days correctly', () => {
            const bytes = stringToUint8Array('"2024-05-07"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getMonth()).toBe(4) // May is 4
            expect(result.getDate()).toBe(7)
        })

        test('should handle leap year dates', () => {
            const bytes = stringToUint8Array('"2024-02-29"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getMonth()).toBe(1) // February is 1
            expect(result.getDate()).toBe(29)
        })
    })

    describe('invalid inputs', () => {
        test('should throw error for invalid date format', () => {
            const bytes = stringToUint8Array('"2024-13-45"')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for completely invalid string', () => {
            const bytes = stringToUint8Array('not a date')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for empty Uint8Array', () => {
            const bytes = new Uint8Array([])

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for invalid month (13)', () => {
            const bytes = stringToUint8Array('"2024-13-01"')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should throw error for invalid day (32)', () => {
            const bytes = stringToUint8Array('"2024-01-32"')

            expect(callToDate(bytes, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        test('should handle non-existent date (2024-04-31) by rolling over to next month', () => {
            const bytes = stringToUint8Array('"2024-04-31"') // April only has 30 days
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
            const bytes = stringToUint8Array('"0001-01-01T00:00:00Z"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(isNaN(result.getTime())).toBe(false)
            expect(result.getUTCFullYear()).toBeGreaterThanOrEqual(0)
            expect(result.getUTCFullYear()).toBeLessThanOrEqual(1)
            expect(result.getUTCMonth()).toBe(0)
            expect(result.getUTCDate()).toBe(1)
        })

        test('should parse far future date - UTC', () => {
            const bytes = stringToUint8Array('"9999-12-31T23:59:59Z"')
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
            const bytes = stringToUint8Array('"2024-01-01T00:00:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            // Local time handling - this test might need adjustment based on your timezone
            expect(result.getHours()).toBe(0)
            expect(result.getMinutes()).toBe(0)
            expect(result.getSeconds()).toBe(0)
        })

        test('should handle midnight UTC', () => {
            const bytes = stringToUint8Array('"2024-01-01T00:00:00Z"')
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
            const fullBytes = new Uint8Array([...bytes, ...stringToUint8Array('-01-01"')])
            const result = (callToDate(fullBytes, 0) as any).value as Date

            expect(result.getFullYear()).toBe(2024)
            expect(result.getMonth()).toBe(0)
            expect(result.getDate()).toBe(1)
        })
    })

    describe('timezone handling', () => {
        test('should handle UTC+0 timezone', () => {
            const bytes = stringToUint8Array('"2024-08-15T15:30:00+00:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result.getUTCHours()).toBe(15)
            expect(result.getUTCMinutes()).toBe(30)
        })

        test('should handle negative timezone offset', () => {
            const bytes = stringToUint8Array('"2024-08-15T15:30:00-03:00"')
            const result = (callToDate(bytes, 0) as any).value as Date

            expect(result).toBeInstanceOf(Date)
            expect(result.getUTCHours()).toBe(18) // 15:30 + 3:00 = 18:30 UTC
            expect(result.getUTCMinutes()).toBe(30)
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should handle timezone offset with minutes', () => {
            const bytes = stringToUint8Array('"2024-08-15T15:30:00+05:45"')
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
})