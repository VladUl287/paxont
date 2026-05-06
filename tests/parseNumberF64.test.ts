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
      const maxValue = Number.MAX_VALUE
      const bytes = toBytes(maxValue.toString())
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: maxValue, nextIndex: 23 })
    })

    test('parses Number.MIN_VALUE', () => {
      const minValue = Number.MIN_VALUE
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

  describe('Format variations', () => {
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
      expect(parseNumberF64(bytes, 0)).toStrictEqual({ value: epsilon, nextIndex: 21 })
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
})
