import { bitLength } from "../src/converters/number"

describe('bitLength', () => {
    test('should return 0 for zero', () => {
        expect(bitLength(0n)).toBe(0)
    })

    describe('positive numbers', () => {
        test('should return 1 for 1n', () => {
            expect(bitLength(1n)).toBe(1)
        })

        test('should return 2 for 2n (binary "10")', () => {
            expect(bitLength(2n)).toBe(2)
        })

        test('should return 2 for 3n (binary "11")', () => {
            expect(bitLength(3n)).toBe(2)
        })

        test('should return 3 for 4n (binary "100")', () => {
            expect(bitLength(4n)).toBe(3)
        })

        test('should return 3 for 7n (binary "111")', () => {
            expect(bitLength(7n)).toBe(3)
        })

        test('should return 4 for 8n (binary "1000")', () => {
            expect(bitLength(8n)).toBe(4)
        })

        test('should handle large positive numbers', () => {
            expect(bitLength(2n ** 64n)).toBe(65)
            expect(bitLength((2n ** 64n) - 1n)).toBe(64)
        })

        test('should handle powers of two correctly', () => {
            expect(bitLength(16n)).toBe(5) // 10000
            expect(bitLength(32n)).toBe(6) // 100000
            expect(bitLength(128n)).toBe(8) // 10000000
        })
    })

    describe('edge cases', () => {
        test('should handle BigInt values near Number limits', () => {
            expect(bitLength(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toBe(54)
        })

        test('should handle extremely large BigInt values', () => {
            const huge = 2n ** 1024n
            expect(bitLength(huge)).toBe(1025)
        })

        test('should handle numbers that are one less than power of two', () => {
            expect(bitLength(2n ** 10n - 1n)).toBe(10)  // 1023 in binary is 10 bits
            expect(bitLength(2n ** 20n - 1n)).toBe(20)  // 1048575 in binary is 20 bits
        })
    })

    describe('performance considerations', () => {
        test('should handle zero quickly', () => {
            const start = performance.now()
            bitLength(0n)
            const duration = performance.now() - start
            expect(duration).toBeLessThan(10) // Should be very fast
        })
    })
})