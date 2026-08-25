import { i16 } from '../../../src/metadata/builder'
import { expectError, expectToParse } from '../utils'

describe('toInt16', () => {
  it('should parse int16 from positive value', () => {
    expectToParse({ meta: i16(), raw: '12345' })
  })

  it('should parse int16 from negative value', () => {
    expectToParse({ meta: i16(), raw: '-12345' })
  })

  it('should parse int16 at minimum value', () => {
    expectToParse({ meta: i16(), raw: '-32768' })
  })

  it('should parse int16 at maximum value', () => {
    expectToParse({ meta: i16(), raw: '32767' })
  })

  it('should handle zero', () => {
    expectToParse({ meta: i16(), raw: '0' })
  })

  it('should throw error for value < -32768', () => {
    expectError({ meta: i16(), raw: '-32769' })
  })

  it('should throw error for value > 32767', () => {
    expectError({ meta: i16(), raw: '32768' })
  })

  it('should throw error for non-numeric input', () => {
    expectError({ meta: i16(), raw: 'abc' })
  })
})