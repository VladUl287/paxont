import { toInt8 } from "../../../src/converters/number/int"
import { defaultOptions } from "../../../src/options"
import { isComplete, isError } from "../../../src/utils/types"

describe('toInt8', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse int8 from positive value', () => {
    const metadata = {} as any
    const context = createContext('123')

    const result = toInt8(metadata, context, 0, 0)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(123)
  })

  it('should parse int8 from negative value', () => {
    const metadata = {} as any
    const context = createContext('-100')

    const result = toInt8(metadata, context, 0, 0)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(-100)
  })

  it('should parse int8 at minimum value', () => {
    const metadata = {} as any
    const context = createContext('-128')

    const result = toInt8(metadata, context, 0, 0)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(-128)
  })

  it('should parse int8 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('127')

    const result = toInt8(metadata, context, 0, 0)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(127)
  })

  it('should throw error for value < -128', () => {
    const metadata = {} as any
    const context = createContext('-129')

    const result = toInt8(metadata, context, 0, 0)
    expect(isError(result)).toBe(true)
    expect((result as any).error).not.toBeUndefined()
  })

  it('should throw error for value > 127', () => {
    const metadata = {} as any
    const context = createContext('128')

    const result = toInt8(metadata, context, 0, 0)
    expect(isError(result)).toBe(true)
    expect((result as any).error).not.toBeUndefined()
  })

  it('should handle zero', () => {
    const metadata = {} as any
    const context = createContext('0')

    const result = toInt8(metadata, context, 0, 0)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(0)
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toInt8(metadata, context, 0, 0)
    expect(isError(result)).toBe(true)
    expect((result as any).error).not.toBeUndefined()
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' -42 ')

    const result = toInt8(metadata, context, 1, 0)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(-42)
  })

  it('should handle different offset and length', () => {
    const metadata = {} as any
    const context = createContext('123')

    const result = toInt8(metadata, context, 1, 3)
    expect(isComplete(result)).toBe(true)
    expect((result as any).value).toBe(23)
  })
})