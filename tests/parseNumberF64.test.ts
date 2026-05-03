import { parseNumberF64 } from "../src/converters/number";

describe('parseNumberF64', () => {
  const toBytes = (str: string): Uint8Array => new TextEncoder().encode(str)

  describe('Basic numeric parsing', () => {
    test('parses positive integer', () => {
      const bytes = toBytes('123')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 123, nextIndex: 3 })
    })

    test('parses negative integer', () => {
      const bytes = toBytes('-456')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: -456, nextIndex: 4 })
    })

    test('parses zero', () => {
      const bytes = toBytes('0')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 0, nextIndex: 1 })
    })

    test('parses multiple zeros', () => {
      const bytes = toBytes('000')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 0, nextIndex: 3 })
    })
  })

  describe('Decimal numbers', () => {
    test('parses positive decimal', () => {
      const bytes = toBytes('123.456')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 123.456, nextIndex: 7 })
    });

    test('parses negative decimal', () => {
      const bytes = toBytes('-123.456')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: -123.456, nextIndex: 8 })
    });

    test('parses decimal without leading zeros', () => {
      const bytes = toBytes('.123')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 0.123, nextIndex: 4 })
    });

    test('parses decimal without trailing zeros', () => {
      const bytes = toBytes('123.')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 123, nextIndex: 4 })
    });

    test('parses decimal with leading zeros', () => {
      const bytes = toBytes('00123.456')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 123.456, nextIndex: 9 })
    })
  })

  // const testCases = [
  //   // Basic numbers
  //   { value: 0, description: 'zero' },
  //   { value: 1, description: 'positive integer' },
  //   { value: -1, description: 'negative integer' },
  //   { value: 3.14, description: 'simple decimal' },
  //   { value: -3.14, description: 'negative decimal' },

  //   // Scientific notation
  //   { value: 1e-10, description: 'very small number' },
  //   { value: 1e10, description: 'very large number' },
  //   { value: 1.23e-5, description: 'scientific notation' },

  //   // Special values
  //   { value: Infinity, description: 'positive infinity' },
  //   { value: -Infinity, description: 'negative infinity' },
  //   { value: NaN, description: 'NaN' },

  //   // Edge cases
  //   { value: Number.MAX_VALUE, description: 'max finite value' },
  //   { value: Number.MIN_VALUE, description: 'min positive value' },
  //   { value: Number.EPSILON, description: 'epsilon' },
  //   { value: Number.MAX_SAFE_INTEGER, description: 'max safe integer' },
  //   { value: Number.MIN_SAFE_INTEGER, description: 'min safe integer' },

  //   // Common math constants
  //   { value: Math.PI, description: 'pi' },
  //   { value: Math.E, description: 'e' },
  //   { value: Math.SQRT2, description: 'square root of 2' },
  //   { value: Math.LN2, description: 'natural log of 2' },

  //   // Fractions that cause floating point precision issues
  //   { value: 0.1, description: 'one tenth' },
  //   { value: 0.2, description: 'two tenths' },
  //   { value: 0.3, description: 'three tenths' },
  //   { value: 1 / 3, description: 'one third' },
  //   { value: 2 / 3, description: 'two thirds' },
  //   { value: 1 / 7, description: 'one seventh' },

  //   // Powers of 2
  //   { value: 2, description: '2^1' },
  //   { value: 4, description: '2^2' },
  //   { value: 8, description: '2^3' },
  //   { value: 16, description: '2^4' },
  //   { value: 32, description: '2^5' },
  //   { value: 64, description: '2^6' },
  //   { value: 128, description: '2^7' },
  //   { value: 256, description: '2^8' },
  //   { value: 512, description: '2^9' },
  //   { value: 1024, description: '2^10' },

  //   // Powers of 10
  //   { value: 10, description: '10^1' },
  //   { value: 100, description: '10^2' },
  //   { value: 1000, description: '10^3' },
  //   { value: 10000, description: '10^4' },
  //   { value: 100000, description: '10^5' },

  //   // Numbers with exact binary representation
  //   { value: 0.5, description: '1/2' },
  //   { value: 0.25, description: '1/4' },
  //   { value: 0.125, description: '1/8' },
  //   { value: 0.0625, description: '1/16' },
  //   { value: 0.03125, description: '1/32' },

  //   // Random values
  //   { value: 42.195, description: 'marathon distance' },
  //   { value: 98.6, description: 'body temperature' },
  //   { value: 212.0, description: 'water boiling point' },
  //   { value: -40.0, description: 'Fahrenheit/Celsius crossover' },
  //   { value: 273.15, description: 'Kelvin zero offset' },

  //   // Large integers
  //   { value: 9007199254740991, description: 'max safe integer' },
  //   // { value: 9007199254740992, description: 'max safe integer + 1 (loses precision)' },

  //   // Small numbers near zero
  //   { value: 1e-15, description: 'very small' },
  //   { value: 1e-16, description: 'even smaller' },
  //   { value: 1e-17, description: 'extremely small' },
  //   { value: 1e-18, description: 'approaching limit' },

  //   // Mixed
  //   { value: 123456.789, description: 'mixed decimal' },
  //   { value: -987654.321, description: 'negative mixed' },
  //   { value: 0.000001, description: 'millionth' },
  //   { value: 1000000, description: 'million' },
  //   { value: 1.23456789, description: 'precise decimal' },
  // ]
  // testCases.forEach((case, i, array) => {
  //   //  it("",() => {}) 
  // })
  // it('should parse various floating point numbers', () => {
  //   const testCases = [
  //     // Basic numbers
  //     { value: 0, description: 'zero' },
  //     { value: 1, description: 'positive integer' },
  //     { value: -1, description: 'negative integer' },
  //     { value: 3.14, description: 'simple decimal' },
  //     { value: -3.14, description: 'negative decimal' },

  //     // Scientific notation
  //     { value: 1e-10, description: 'very small number' },
  //     { value: 1e10, description: 'very large number' },
  //     { value: 1.23e-5, description: 'scientific notation' },

  //     // Special values
  //     { value: Infinity, description: 'positive infinity' },
  //     { value: -Infinity, description: 'negative infinity' },
  //     { value: NaN, description: 'NaN' },

  //     // Edge cases
  //     { value: Number.MAX_VALUE, description: 'max finite value' },
  //     { value: Number.MIN_VALUE, description: 'min positive value' },
  //     { value: Number.EPSILON, description: 'epsilon' },
  //     { value: Number.MAX_SAFE_INTEGER, description: 'max safe integer' },
  //     { value: Number.MIN_SAFE_INTEGER, description: 'min safe integer' },

  //     // Common math constants
  //     { value: Math.PI, description: 'pi' },
  //     { value: Math.E, description: 'e' },
  //     { value: Math.SQRT2, description: 'square root of 2' },
  //     { value: Math.LN2, description: 'natural log of 2' },

  //     // Fractions that cause floating point precision issues
  //     { value: 0.1, description: 'one tenth' },
  //     { value: 0.2, description: 'two tenths' },
  //     { value: 0.3, description: 'three tenths' },
  //     { value: 1 / 3, description: 'one third' },
  //     { value: 2 / 3, description: 'two thirds' },
  //     { value: 1 / 7, description: 'one seventh' },

  //     // Powers of 2
  //     { value: 2, description: '2^1' },
  //     { value: 4, description: '2^2' },
  //     { value: 8, description: '2^3' },
  //     { value: 16, description: '2^4' },
  //     { value: 32, description: '2^5' },
  //     { value: 64, description: '2^6' },
  //     { value: 128, description: '2^7' },
  //     { value: 256, description: '2^8' },
  //     { value: 512, description: '2^9' },
  //     { value: 1024, description: '2^10' },

  //     // Powers of 10
  //     { value: 10, description: '10^1' },
  //     { value: 100, description: '10^2' },
  //     { value: 1000, description: '10^3' },
  //     { value: 10000, description: '10^4' },
  //     { value: 100000, description: '10^5' },

  //     // Numbers with exact binary representation
  //     { value: 0.5, description: '1/2' },
  //     { value: 0.25, description: '1/4' },
  //     { value: 0.125, description: '1/8' },
  //     { value: 0.0625, description: '1/16' },
  //     { value: 0.03125, description: '1/32' },

  //     // Random values
  //     { value: 42.195, description: 'marathon distance' },
  //     { value: 98.6, description: 'body temperature' },
  //     { value: 212.0, description: 'water boiling point' },
  //     { value: -40.0, description: 'Fahrenheit/Celsius crossover' },
  //     { value: 273.15, description: 'Kelvin zero offset' },

  //     // Large integers
  //     { value: 9007199254740991, description: 'max safe integer' },
  //     // { value: 9007199254740992, description: 'max safe integer + 1 (loses precision)' },

  //     // Small numbers near zero
  //     { value: 1e-15, description: 'very small' },
  //     { value: 1e-16, description: 'even smaller' },
  //     { value: 1e-17, description: 'extremely small' },
  //     { value: 1e-18, description: 'approaching limit' },

  //     // Mixed
  //     { value: 123456.789, description: 'mixed decimal' },
  //     { value: -987654.321, description: 'negative mixed' },
  //     { value: 0.000001, description: 'millionth' },
  //     { value: 1000000, description: 'million' },
  //     { value: 1.23456789, description: 'precise decimal' },
  //   ]

  //   const encoder = new TextEncoder()
  //   testCases.forEach(({ value }) => {
  //     const bytes = encoder.encode(value.toString())
  //     const result = parseNumberF64(bytes)

  //     if (isNaN(value)) {
  //       expect(result).toBeNaN()
  //     }
  //     else if (value === Infinity || value === -Infinity) {
  //       expect(result).toBe(value)
  //     }
  //     else {
  //       expect(result).toEqual(value)
  //     }
  //   })
  // })
})
