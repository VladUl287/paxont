import { toUint8 } from "../../../src/converters/number/int"
import { defaultOptions } from "../../../src/options"
import { ReadResultType } from "../../../src/utils/types"

describe('toUint8', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse uint8 from valid input', () => {
    const metadata = {} as any
    const context = createContext('123')

    const result = toUint8(metadata, context, 0, 0)

    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint8 from string with leading zeros', () => {
    const metadata = {} as any
    const context = createContext('001')

    const result = toUint8(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 1, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint8 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('255')

    const result = toUint8(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 255, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value > 255', () => {
    const metadata = {} as any
    const context = createContext('256')

    const result = toUint8(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for negative value', () => {
    const metadata = {} as any
    const context = createContext('-1')

    const result = toUint8(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toUint8(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for empty input', () => {
    const metadata = {} as any
    const context = createContext('')

    const result = toUint8(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' 42 ')

    const result = toUint8(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 42, nextIndex: context.reader.bytes.length - 1 })
  })
})