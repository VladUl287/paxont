import { toUint16 } from "../../../src/converters/number/int"
import { defaultOptions } from "../../../src/options"
import { ReadResultType } from "../../../src/utils/types"

describe('toUint16', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse uint16 from valid input', () => {
    const metadata = {} as any
    const context = createContext('12345')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 12345, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint16 from small number', () => {
    const metadata = {} as any
    const context = createContext('5')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 5, nextIndex: context.reader.bytes.length })
  })

  it('should parse uint16 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('65535')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 65535, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value > 65535', () => {
    const metadata = {} as any
    const context = createContext('65536')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for negative value', () => {
    const metadata = {} as any
    const context = createContext('-1')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' 12345 ')

    const result = toUint16(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 12345, nextIndex: context.reader.bytes.length - 1 })
  })

  it('should handle leading zeros', () => {
    const metadata = {} as any
    const context = createContext('00123')

    const result = toUint16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 123, nextIndex: context.reader.bytes.length })
  })
})