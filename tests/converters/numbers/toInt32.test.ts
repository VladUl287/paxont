import { i32 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toInt32', () => {
  const meta = i32()

  it('should parse int32 from positive value', () => {
    expectToParse({ meta, raw: '123456789' })
  })

  it('should parse int32 from negative value', () => {
    expectToParse({ meta, raw: '-123456789' })
  })

  it('should parse int32 at minimum value', () => {
    expectToParse({ meta, raw: '-2147483648' })
  })

  it('should parse int32 at maximum value', () => {
    expectToParse({ meta, raw: '2147483647' })
  })

  it('should handle zero', () => {
    expectToParse({ meta, raw: '0' })
  })

  it('should throw error for value < -2147483648', () => {
    expectError({ meta, raw: '-2147483649' })
  })

  it('should throw error for value > 2147483647', () => {
    expectError({ meta, raw: '2147483648' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta, raw: 'abc' })
  })
})