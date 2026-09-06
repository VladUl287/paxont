import { u16 } from "../../../src/metadata/builder"
import { expectError, expectToParse } from "../utils"

describe('toUint16', () => {
  const meta = u16()

  it('should parse uint16 from valid input', () => {
    expectToParse({ meta, raw: '12345' })
  })

  it('should parse uint16 from small number', () => {
    expectToParse({ meta, raw: '5' })
  })

  it('should parse uint16 at maximum value', () => {
    expectToParse({ meta, raw: '65535' })
  })

  it('should throw error for value > 65535', () => {
    expectError({ meta, raw: '65536' })
  })

  it('should throw error for negative value', () => {
    expectError({ meta, raw: '-1' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta, raw: 'abs' })
  })
})