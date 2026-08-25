import { u32 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toUint32', () => {
  const meta = u32()

  it('should parse uint32 from valid input', () => {
    expectToParse({ meta, raw: '123456789' })
  })

  it('should parse uint32 from small number', () => {
    expectToParse({ meta, raw: '42' })
  })

  it('should parse uint32 at maximum value', () => {
    expectToParse({ meta, raw: '4294967295' })
  })

  it('should handle leading zeros', () => {
    expectToParse({ meta, raw: '000123456789', expected: 123456789 })
  })

  it('should throw error for value > 4294967295', () => {
    expectError({ meta, raw: '4294967296' })
  })

  it('should throw error for negative value', () => {
    expectError({ meta, raw: '-1' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta, raw: 'abc123' })
  })
})