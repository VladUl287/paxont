import { toUint32 } from "../../../src/converters/number/int"
import { defaultOptions } from "../../../src/options"
import { ReadResultType } from "../../../src/utils/types"

describe('toUint32', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse uint32 from valid input', () => {
    const metadata = {} as any
    const context = createContext('123456789')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint32 from small number', () => {
    const metadata = {} as any
    const context = createContext('42')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 42, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint32 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('4294967295')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 4294967295, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value > 4294967295', () => {
    const metadata = {} as any
    const context = createContext('4294967296')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for negative value', () => {
    const metadata = {} as any
    const context = createContext('-1')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc123')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' 123456789 ')

    const result = toUint32(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789, nextIndex: context.reader.bytes.length - 1 })
  })

  it('should handle leading zeros', () => {
    const metadata = {} as any
    const context = createContext('000123456789')

    const result = toUint32(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123456789, nextIndex: context.reader.bytes.length })
  })
})