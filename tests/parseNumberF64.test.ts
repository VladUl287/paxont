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

  describe('Scientific notation', () => {
    test('parses scientific notation with e', () => {
      const bytes = toBytes('1.23e4')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 12300, nextIndex: 6 })
    })

    test('parses scientific notation with E', () => {
      const bytes = toBytes('1.23E4')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 12300, nextIndex: 6 })
    })

    test('parses scientific notation with negative exponent', () => {
      const bytes = toBytes('1.23e-2')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 0.0123, nextIndex: 7 })
    })

    test('parses scientific notation with positive exponent sign', () => {
      const bytes = toBytes('1.23e+2')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 123, nextIndex: 7 })
    })

    test('parses scientific notation without decimal', () => {
      const bytes = toBytes('123e4')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 1230000, nextIndex: 5 })
    })

    test('parses scientific notation with negative base', () => {
      const bytes = toBytes('-1.23e4')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: -12300, nextIndex: 7 })
    })
  })

  describe('Special values', () => {
    test('parses Infinity', () => {
      const bytes = toBytes('Infinity')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: Infinity, nextIndex: 8 })
    })

    test('parses -Infinity', () => {
      const bytes = toBytes('-Infinity')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: -Infinity, nextIndex: 9 })
    });

    test('parses NaN', () => {
      const bytes = toBytes('NaN')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: NaN, nextIndex: 3 })
    })
  })

  describe('Start index parameter', () => {
    test('starts parsing from specified index', () => {
      const bytes = toBytes('abc123')
      expect(parseNumberF64(bytes, 3)).toStrictEqual({ value: 123, nextIndex: 6 })
    })

    test('handles whitespace before start index', () => {
      const bytes = toBytes('  123')
      expect(parseNumberF64(bytes, 2)).toStrictEqual({ value: 123, nextIndex: 5 })
    })

    test('parses number in middle of buffer', () => {
      const bytes = toBytes('prefix 456 suffix')
      expect(parseNumberF64(bytes, 7)).toStrictEqual({ value: 456, nextIndex: 10 })
    })
  })

  describe('Edge cases and boundaries', () => {
    test('parses maximum safe integer', () => {
      const bytes = toBytes('9007199254740991')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 9007199254740991, nextIndex: 16 })
    })

    test('parses Number.MAX_VALUE', () => {
      const maxValue = 1.7976931348623157e+308
      const bytes = toBytes(maxValue.toString())
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: maxValue, nextIndex: 19 })
    })

    test('parses Number.MIN_VALUE', () => {
      const minValue = 5e-324;
      const bytes = toBytes(minValue.toString())
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: minValue, nextIndex: 6 })
    });

    test('parses very small number', () => {
      const bytes = toBytes('1e-308')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 1e-308, nextIndex: 6 })
    });

    test('parses very large number', () => {
      const bytes = toBytes('1e308')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 1e308, nextIndex: 5 })
    })
  })

  describe('Error handling', () => {
    test('throws on empty string', () => {
      const bytes = toBytes('')
      expect(() => parseNumberF64(bytes, 0)).toThrow()
    })

    test('throws on whitespace only', () => {
      const bytes = toBytes('   ')
      expect(() => parseNumberF64(bytes, 0)).toThrow()
    })

    test('throws on invalid characters', () => {
      const bytes = toBytes('12a3');
      expect(() => parseNumberF64(bytes, 0)).toThrow()
    })

    test('throws on multiple decimal points', () => {
      const bytes = toBytes('1.2.3')
      expect(() => parseNumberF64(bytes, 0)).toThrow()
    })

    test('throws on multiple exponent markers', () => {
      const bytes = toBytes('1e2e3')
      expect(() => parseNumberF64(bytes, 0)).toThrow()
    })

    test('throws when start index is out of bounds', () => {
      const bytes = toBytes('123')
      expect(() => parseNumberF64(bytes, 5)).toThrow()
    })

    test('throws when no number found after whitespace', () => {
      const bytes = toBytes('   abc')
      expect(() => parseNumberF64(bytes, 0)).toThrow()
    })
  })

  describe('Format variations', () => {
    test('handles plus sign for positive numbers', () => {
      const bytes = toBytes('+123')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 123, nextIndex: 4 })
    })

    test('handles plus sign for scientific notation', () => {
      const bytes = toBytes('+1.23e+4')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 12300, nextIndex: 8 })
    })

    test('parses number with leading zeros and decimal', () => {
      const bytes = toBytes('000.456')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 0.456, nextIndex: 7 })
    })

    test('parses negative zero', () => {
      const bytes = toBytes('-0')
      const result = parseNumberF64(bytes, 0)
      expect(result).toStrictEqual({ value: -0, nextIndex: 2 })
    })
  })

  describe('Precision tests', () => {
    test('maintains precision for double values', () => {
      const bytes = toBytes('0.1')
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: 0.1, nextIndex: 3 })
    })

    test('parses epsilon', () => {
      const epsilon = 2.220446049250313e-16
      const bytes = toBytes(epsilon.toString())
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: epsilon, nextIndex: 19 })
    })
  })

  describe('Random and comprehensive tests', () => {
    const testNumbers = [
      0, 1, -1, 3.14159, -2.71828, 1000000, -0.000001,
      1.23456789e-10, 9.87654321e20, -5.4321e-15
    ]

    testNumbers.forEach(num => {
      test(`correctly parses roundtrip for ${num}`, () => {
        const bytes = toBytes(num.toString())
        const parsed = parseNumberF64(bytes, 0)
        expect(parsed).toStrictEqual({ value: num, nextIndex: bytes.length })
      })
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
