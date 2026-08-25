import { i8 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toInt8', () => {
  it('should parse int8 from positive value', () => {
    expectToParse({ meta: i8(), raw: '123' })
  })

  it('should parse int8 from negative value', () => {
    expectToParse({ meta: i8(), raw: '-100' })
  })

  it('should parse int8 at minimum value', () => {
    expectToParse({ meta: i8(), raw: '-128' })
  })

  it('should parse int8 at maximum value', () => {
    expectToParse({ meta: i8(), raw: '127' })
  })

  it('should handle zero', () => {
    expectToParse({ meta: i8(), raw: '0' })
  })

  it('should throw error for value < -128', () => {
    expectError({ meta: i8(), raw: '-129' })
  })

  it('should throw error for value > 127', () => {
    expectError({ meta: i8(), raw: '128' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta: i8(), raw: 'abs' })
  })
})