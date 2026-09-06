import { date } from "../../src/metadata/builder"
import { isComplete } from "../../src/utils/result"
import { precomputeUTC } from "../../src/utils/utc"
import { expectToParse } from "./utils"
import dayjs from 'dayjs'

describe('toDate', () => {
    const meta = date()

    describe('valid ISO date formats', () => {
        test('should parse basic ISO date (YYYY-MM-DD) - local time', () => {
            const value = '2024-01-15'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse ISO date with time (YYYY-MM-DDThh:mm) - local time', () => {
            const value = '2024-03-20T14:30'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse ISO date with time (YYYY-MM-DDThh:mm:ss) - local time', () => {
            const value = '2024-03-20T14:30:45'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse ISO date with milliseconds - UTC', () => {
            const value = '2024-06-10T09:15:30.123Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse ISO date with timezone offset - UTC', () => {
            const value = '2024-12-25T10:00:00+05:30'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse UTC ISO date with Z suffix', () => {
            const value = '2024-07-04T12:00:00Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse ISO date with time and timezone offset - UTC', () => {
            const value = '2024-01-15T08:30:00-08:00'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse later then 1970 - UTC', () => {
            const value = '1971-01-01T00:00:00.000Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse earlier then 1970 - UTC', () => {
            const value = '1969-01-01T00:00:00.000Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse early ISO date - UTC', () => {
            const value = '0001-01-01T00:00:00Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse earliest ISO date - UTC', () => {
            const value = '0000-01-01T00:00:00Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should parse far future date - UTC', () => {
            const value = '9999-12-31T23:59:59Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle midnight (00:00:00) - local time', () => {
            const value = '2024-01-01T00:00:00'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle midnight UTC', () => {
            const value = '2024-01-01T00:00:00Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle UTC+0 timezone', () => {
            const value = '2024-08-15T15:30:00+00:00'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle negative timezone offset', () => {
            const value = '2024-08-15T15:30:00-03:00'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle timezone offset with minutes', () => {
            const value = '2024-08-15T15:30:00+05:45'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle non-existent date (2024-04-31) by rolling over to next month', () => {
            const value = '2024-04-31'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
            })
        })

        test('should handle date sub 1970 - UTC', () => {
            const value = '1600-07-24T12:32Z'
            expectToParse({
                meta,
                raw: `"${value}"`,
                expected: expect.any(Date),
                alsoExpect: (result) => {
                    if (isComplete(result)) {
                        const a = dayjs(value).toISOString()
                        const b = result.value.toISOString()
                        expect(b).toEqual(a)
                    }
                }
            })
        })

        test('should handle date outside of precomputed range', () => {
            const utc = precomputeUTC({ minYear: 0, maxYear: 2029 })

            expect(utc(2030, 0)).toEqual(Date.UTC(2030, 0))
            expect(utc(-1, 0)).toEqual(Date.UTC(-1, 0))
        })
    })


    // describe('valid RFC date formats', () => {
    //     test('should parse RFC 2822 date', () => {
    //         const value = 'Mon, 15 Jan 2024 10:30:00 GMT'
    //         expectToParse({
    //             meta,
    //             raw: `"${value}"`,
    //             expected: expect.any(Date),
    //             alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
    //         })
    //     })

    //     test('should parse RFC 2822 date', () => {
    //         const value = 'Mon, 15 Jan 2024 10:30:00 +0300'
    //         expectToParse({
    //             meta,
    //             raw: `"${value}"`,
    //             expected: expect.any(Date),
    //             alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
    //         })
    //     })

    //     test('should parse RFC 2822 date', () => {
    //         const value = 'Mon, 15 Jan 2024 10:30:00 EST'
    //         expectToParse({
    //             meta,
    //             raw: `"${value}"`,
    //             expected: expect.any(Date),
    //             alsoExpect: (result) => { isComplete(result) && expect(result.value.toISOString()).toEqual(dayjs(value).toISOString()) }
    //         })
    //     })
    // })

    // describe('invalid inputs', () => {
    //     test('should throw error for invalid date format', () => {
    //         expectError({ meta, raw: '"2024-13-45"' })
    //     })

    //     test('should throw error for completely invalid string', () => {
    //         expectError({ meta, raw: '"not a date"' })
    //     })

    //     test('should throw error for empty Uint8Array', () => {
    //         expectError({ meta, bytes: new Uint8Array([]) })
    //     })

    //     test('should throw error for invalid month (13)', () => {
    //         expectError({ meta, raw: '"2024-13-01"' })
    //     })

    //     test('should throw error for invalid day (32)', () => {
    //         expectError({ meta, raw: '"2024-01-32"' })
    //     })
    // })
})