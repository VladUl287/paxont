import { toInt32 } from "../../../src/converters/number/int"
import { defaultOptions } from "../../../src/options"
import { ReadResultType } from "../../../src/utils/types"

describe('toInt32', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse int32 from positive value', () => {
    const metadata = {} as any
    const context = createContext('123456789')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789, nextIndex: context.reader.bytes.length })
  })

  it('should parse int32 from negative value', () => {
    const metadata = {} as any
    const context = createContext('-123456789')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -123456789, nextIndex: context.reader.bytes.length })
  })

  it('should parse int32 at minimum value', () => {
    const metadata = {} as any
    const context = createContext('-2147483648')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -2147483648, nextIndex: context.reader.bytes.length })
  })

  it('should parse int32 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('2147483647')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 2147483647, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value < -2147483648', () => {
    const metadata = {} as any
    const context = createContext('-2147483649')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for value > 2147483647', () => {
    const metadata = {} as any
    const context = createContext('2147483648')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle zero', () => {
    const metadata = {} as any
    const context = createContext('0')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 0, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toInt32(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' 123456789 ')

    const result = toInt32(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789, nextIndex: context.reader.bytes.length - 1 })
  })
})