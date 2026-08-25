import { i64 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toInt64', () => {
  const meta = i64()

  it('should parse int64 as bigint from positive value', () => {
    expectToParse({ meta, raw: '9223372036854775800', expected: 9223372036854775800n })
  })

  it('should parse int64 as bigint from negative value', () => {
    expectToParse({ meta, raw: '-9223372036854775800', expected: -9223372036854775800n })
  })

  it('should parse int64 at maximum value', () => {
    expectToParse({ meta, raw: '9223372036854775807', expected: 9223372036854775807n })
  })

  it('should parse int64 at minimum value', () => {
    expectToParse({ meta, raw: '-9223372036854775808', expected: -9223372036854775808n })
  })

  it('should handle zero', () => {
    expectToParse({ meta, raw: '0', expected: 0n })
  })

  it('should handle leading zeros', () => {
    expectToParse({ meta, raw: '000123456789', expected: 123456789n })
  })

  it('should throw error for value > 9223372036854775807', () => {
    expectError({ meta, raw: '9223372036854775808' })
  })

  it('should throw error for value < -9223372036854775808', () => {
    expectError({ meta, raw: '-9223372036854775809' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta, raw: 'abs' })
  })
})