import { u64 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toUint64', () => {
  const meta = u64()

  it('should parse uint64 as bigint from valid input', () => {
    expectToParse({ meta, raw: '18446744073709551600', expected: 18446744073709551600n })
  })

  it('should parse uint64 from small number as bigint', () => {
    expectToParse({ meta, raw: '42', expected: 42n })
  })

  it('should parse uint64 at maximum value', () => {
    expectToParse({ meta, raw: '18446744073709551615', expected: 18446744073709551615n })
  })

  it('should handle zero', () => {
    expectToParse({ meta, raw: '0', expected: 0n })
  })

  it('should throw error for value > 18446744073709551615', () => {
    expectError({ meta, raw: '18446744073709551616' })
  })

  it('should throw error for negative value', () => {
    expectError({ meta, raw: '-1' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta, raw: 'abc' })
  })

  it('should handle leading zeros', () => {
    expectError({ meta, raw: '000123456789' })
  })
})