import { toInt64 } from "../../../src/converters/number/bigint"
import { defaultOptions } from "../../../src/options"
import { ReadResultType } from "../../../src/utils/types"

describe('toInt64', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse int64 as bigint from positive value', () => {
    const metadata = {} as any
    const context = createContext('9223372036854775800')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 9223372036854775800n, nextIndex: context.reader.bytes.length })
  })

  it('should parse int64 as bigint from negative value', () => {
    const metadata = {} as any
    const context = createContext('-9223372036854775800')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -9223372036854775800n, nextIndex: context.reader.bytes.length })
  })

  it('should parse int64 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('9223372036854775807')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 9223372036854775807n, nextIndex: context.reader.bytes.length })
  })

  it('should parse int64 at minimum value', () => {
    const metadata = {} as any
    const context = createContext('-9223372036854775808')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -9223372036854775808n, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value > 9223372036854775807', () => {
    const metadata = {} as any
    const context = createContext('9223372036854775808')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for value < -9223372036854775808', () => {
    const metadata = {} as any
    const context = createContext('-9223372036854775809')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle zero', () => {
    const metadata = {} as any
    const context = createContext('0')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 0n, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' 9223372036854775800 ')

    const result = toInt64(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 9223372036854775800n, nextIndex: context.reader.bytes.length - 1 })
  })

  it('should handle leading zeros', () => {
    const metadata = {} as any
    const context = createContext('000123456789')

    const result = toInt64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789n, nextIndex: context.reader.bytes.length })
  })
})