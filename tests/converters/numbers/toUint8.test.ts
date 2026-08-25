import { u8 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toUint8', () => {
  const meta = u8()

  it('should parse uint8 from valid input', () => {
    expectToParse({ meta, raw: '123' })
  })

  it('should parse uint8 from string with leading zeros', () => {
    expectToParse({ meta, raw: '001', expected: 1 })
  })

  it('should parse uint8 at maximum value', () => {
    expectToParse({ meta, raw: '255' })
  })

  it('should throw error for value > 255', () => {
    expectError({ meta, raw: '256' })
  })

  it('should throw error for negative value', () => {
    expectError({ meta, raw: '-1' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta, raw: 'abs' })
  })

  it('should throw error for empty input', () => {
    expectError({ meta, raw: '' })
  })
})