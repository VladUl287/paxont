import { toUint64 } from "../../../src/converters/number/bigint"
import { defaultOptions } from "../../../src/options"
import { ReadResultType } from "../../../src/utils/types"

describe('toUint64', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse uint64 as bigint from valid input', () => {
    const metadata = {} as any
    const context = createContext('18446744073709551600')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 18446744073709551600n, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint64 from small number as bigint', () => {
    const metadata = {} as any
    const context = createContext('42')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 42n, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint64 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('18446744073709551615')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 18446744073709551615n, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value > 18446744073709551615', () => {
    const metadata = {} as any
    const context = createContext('18446744073709551616')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for negative value', () => {
    const metadata = {} as any
    const context = createContext('-1')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle zero', () => {
    const metadata = {} as any
    const context = createContext('0')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 0n, nextIndex: context.reader.bytes.length })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' 18446744073709551600 ')

    const result = toUint64(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 18446744073709551600n, nextIndex: context.reader.bytes.length - 1 })
  })

  it('should handle leading zeros', () => {
    const metadata = {} as any
    const context = createContext('000123456789')

    const result = toUint64(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789n, nextIndex: context.reader.bytes.length })
  })
})