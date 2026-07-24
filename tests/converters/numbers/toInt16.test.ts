import { toInt16 } from '../../../src/converters/number/int'
import { defaultOptions } from '../../../src/options'
import { ReadResultType } from '../../../src/utils/types'

describe('toInt16', () => {
  const encoder = new TextEncoder()

  const createContext = (value: string) => ({
    reader: { bytes: encoder.encode(value), writable: false },
    options: defaultOptions,
    stack: {} as any
  })

  it('should parse int16 from positive value', () => {
    const metadata = {} as any
    const context = createContext('12345')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 12345, nextIndex: context.reader.bytes.length })
  })

  it('should parse int16 from negative value', () => {
    const metadata = {} as any
    const context = createContext('-12345')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -12345, nextIndex: context.reader.bytes.length })
  })

  it('should parse int16 at minimum value', () => {
    const metadata = {} as any
    const context = createContext('-32768')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -32768, nextIndex: context.reader.bytes.length })
  })

  it('should parse int16 at maximum value', () => {
    const metadata = {} as any
    const context = createContext('32767')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 32767, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for value < -32768', () => {
    const metadata = {} as any
    const context = createContext('-32769')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should throw error for value > 32767', () => {
    const metadata = {} as any
    const context = createContext('32768')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle zero', () => {
    const metadata = {} as any
    const context = createContext('0')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: 0, nextIndex: context.reader.bytes.length })
  })

  it('should throw error for non-numeric input', () => {
    const metadata = {} as any
    const context = createContext('abc')

    const result = toInt16(metadata, context, 0, 0)
    expect(result).toEqual({ type: ReadResultType.ERROR, error: new Error() })
  })

  it('should handle whitespace in input', () => {
    const metadata = {} as any
    const context = createContext(' -12345 ')

    const result = toInt16(metadata, context, 1, 0)
    expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: -12345, nextIndex: context.reader.bytes.length - 1 })
  })
})