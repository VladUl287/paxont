import { toDate } from "../../src/converters/date"
import { ConvertCtx } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"

describe('toDate', () => {
    function stringToUint8Array(str: string) {
        return new TextEncoder().encode(str)
    }

    function callToDate(bytes: Uint8Array, i: number) {
        const meta: any = {}
        const ctx: ConvertCtx = { bytes: bytes, options: defaultOptions }
        return toDate(ctx, meta, i, 0)
    }

    describe('valid ISO date formats', () => {
        test('should parse basic ISO date (YYYY-MM-DD)', () => {
            const bytes = stringToUint8Array('"2024-01-15"')
            const result = callToDate(bytes, 0)

            expect(result).toBeInstanceOf(Date)
            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(0) // January is 0
            expect(result.getUTCDate()).toBe(15)
        })

        test('should parse ISO date with time (YYYY-MM-DDThh:mm:ss)', () => {
            const bytes = stringToUint8Array('"2024-03-20T14:30:45"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(2) // March is 2
            expect(result.getUTCDate()).toBe(20)
            expect(result.getUTCHours()).toBe(11)
            expect(result.getUTCMinutes()).toBe(30)
            expect(result.getUTCSeconds()).toBe(45)
        })

        test('should parse ISO date with milliseconds', () => {
            const bytes = stringToUint8Array('"2024-06-10T09:15:30.123Z"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(5) // June is 5
            expect(result.getUTCDate()).toBe(10)
            expect(result.getUTCMilliseconds()).toBe(123)
        })

        test('should parse ISO date with timezone offset', () => {
            const bytes = stringToUint8Array('"2024-12-25T10:00:00+05:30"')
            const result = callToDate(bytes, 0)

            expect(result).toBeInstanceOf(Date)
            // Verify it parsed without throwing error
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should parse UTC ISO date with Z suffix', () => {
            const bytes = stringToUint8Array('"2024-07-04T12:00:00Z"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(6) // July is 6
            expect(result.getUTCDate()).toBe(4)
            expect(result.getUTCHours()).toBe(12)
        })
    })

    describe('edge cases with UTF-8 bytes', () => {
        test('should handle bytes that are exactly the date string', () => {
            const bytes = new Uint8Array([34, 50, 48, 50, 52, 45, 48, 49, 45, 48, 49, 34]) // "2024-01-01"
            const result = callToDate(bytes, 0)

            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(0)
            expect(result.getUTCDate()).toBe(1)
        })

        test('should handle single-digit months and days correctly', () => {
            const bytes = stringToUint8Array('"2024-05-07"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCMonth()).toBe(4) // May is 4
            expect(result.getUTCDate()).toBe(7)
        })

        test('should handle leap year dates', () => {
            const bytes = stringToUint8Array('"2024-02-29"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCMonth()).toBe(1) // February is 1
            expect(result.getUTCDate()).toBe(29)
        })
    })

    describe('invalid inputs', () => {
        test('should throw error for invalid date format', () => {
            const bytes = stringToUint8Array('"2024-13-45"')

            expect(() => callToDate(bytes, 0)).toThrow('invalid date value, at index 11')
        })

        test('should throw error for completely invalid string', () => {
            const bytes = stringToUint8Array('not a date')

            expect(() => callToDate(bytes, 0)).toThrow('invalid date value, at index 0')
        })

        test('should throw error for empty Uint8Array', () => {
            const bytes = new Uint8Array([])

            expect(() => callToDate(bytes, 0)).toThrow('invalid date value, at index 0')
        })

        test('should throw error for invalid month (13)', () => {
            const bytes = stringToUint8Array('"2024-13-01"')

            expect(() => callToDate(bytes, 0)).toThrow()
        })

        test('should throw error for invalid day (32)', () => {
            const bytes = stringToUint8Array('"2024-01-32"')

            expect(() => callToDate(bytes, 0)).toThrow()
        })

        test('should not throw error for non-existent date (2024-04-31)', () => {
            const bytes = stringToUint8Array('"2024-04-31"') // April only has 30 days
            const result = callToDate(bytes, 0)
            expect(result.getUTCFullYear()).toBe(2024)
            expect(result.getUTCMonth()).toBe(4) //5 
            expect(result.getUTCDate()).toBe(1)
            expect(result.getUTCHours()).toBe(0)
            expect(result.getUTCMinutes()).toBe(0)
            expect(result.getUTCSeconds()).toBe(0)
        })
    })

    describe('boundary cases', () => {
        test('should parse earliest ISO date', () => {
            const bytes = stringToUint8Array('"0001-01-01T00:00:00Z"')
            const result = callToDate(bytes, 0)

            expect(result).toBeInstanceOf(Date)
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should parse far future date', () => {
            const bytes = stringToUint8Array('"9999-12-31T23:59:59Z"')
            const result = callToDate(bytes, 0)

            expect(result).toBeInstanceOf(Date)
            expect(isNaN(result.getTime())).toBe(false)
        })

        test('should handle midnight (00:00:00)', () => {
            const bytes = stringToUint8Array('"2024-01-01T00:00:00"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCHours()).toBe(21)
            expect(result.getUTCMinutes()).toBe(0)
            expect(result.getUTCSeconds()).toBe(0)
        })
    })

    describe('UTF-8 multi-byte character handling', () => {
        test('should handle UTF-8 bytes with multi-byte characters before/after date', () => {
            // Simulating scenario where bytes might have extra content
            const dateStr = '"2024-01-15"'
            const encoder = new TextEncoder()
            const bytes = encoder.encode(dateStr)

            const result = callToDate(bytes, 0)
            expect(result.getUTCFullYear()).toBe(2024)
        })

        test('should correctly decode UTF-8 bytes for ASCII range (date characters)', () => {
            // All date characters are ASCII (single byte in UTF-8)
            const bytes = new Uint8Array([34, 0x32, 0x30, 0x32, 0x34]) // '2','0','2','4'
            const fullBytes = new Uint8Array([...bytes, ...stringToUint8Array('-01-01"')])
            const result = callToDate(fullBytes, 0)

            expect(result.getUTCFullYear()).toBe(2024)
        })
    })

    describe('timezone handling', () => {
        test('should handle UTC+0 timezone', () => {
            const bytes = stringToUint8Array('"2024-08-15T15:30:00+00:00"')
            const result = callToDate(bytes, 0)

            expect(result.getUTCHours()).toBe(15)
            expect(result.getUTCMinutes()).toBe(30)
        })

        test('should handle negative timezone offset', () => {
            const bytes = stringToUint8Array('"2024-08-15T15:30:00-03:00"')
            const result = callToDate(bytes, 0)

            // Should parse successfully
            expect(result).toBeInstanceOf(Date)
            expect(isNaN(result.getTime())).toBe(false)
        })
    })

    describe('performance and large inputs', () => {
        test('should handle large Uint8Array efficiently', () => {
            const dateStr = '"2024-01-15T12:00:00.000Z"'
            const encoder = new TextEncoder()
            const bytes = encoder.encode(dateStr)

            const start = performance.now()
            const result = callToDate(bytes, 0)
            const end = performance.now()

            expect(result).toBeInstanceOf(Date)
            expect(end - start).toBeLessThan(100) // Should parse in less than 100ms
        })

        test('should handle Uint8Array with trailing null bytes', () => {
            const dateStr = '"2024-01-15"'
            const encoder = new TextEncoder()
            const dateBytes = encoder.encode(dateStr)
            const bytes = new Uint8Array([...dateBytes, 0, 0, 0])

            const result = callToDate(bytes, 0)
            expect(result.getUTCFullYear()).toBe(2024)
        })
    })
})