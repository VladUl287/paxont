import { bigInt } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toBigInt', () => {
  it('should parse usual bigint', () => {
    expectToParse({ meta: bigInt(), raw: '18446744073709551600', expected: 18446744073709551600n })
  })

  it('should parse big bigint', () => {
    const data = Array.from({ length: 1000 }, (_, i) => i).join('')
    const bigint = BigInt(data)
    expectToParse({ meta: bigInt(), raw: data, expected: bigint })
  })

  it('should handle zero', () => {
    expectToParse({ meta: bigInt(), raw: '0', expected: 0n })
  })

  it('should handle leading zeros', () => {
    expectToParse({ meta: bigInt(), raw: '000123456789', expected: 123456789n })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta: bigInt(), raw: 'abs' })
  })
})