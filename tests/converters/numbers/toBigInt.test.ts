import { array, bigInt } from "../../../src/metadata/builder"
import { BaseMeta, JsonParsingContext } from "../../../src/metadata/types"
import { defaultOptions } from "../../../src/options"
import { JsonReader } from "../../../src/utils/reader"
import { ReadResultType } from "../../../src/utils/result"
import { Stack } from "../../../src/utils/stack"
import { deserializePartially, expectError, toBytes } from "../utils"

describe('toBigInt', () => {
  const expectToParse = <M extends BaseMeta<any>>(
    options: {
      meta: M,
      raw?: string,
      bytes?: Uint8Array,
      start?: number,
      end?: number,
      depth?: number,
      expected?: any
    }) => {
    let { meta, raw, bytes, start, end, depth, expected } = options

    bytes ??= toBytes(raw ?? '')
    start ??= 0
    depth ??= 0
    const ctx: JsonParsingContext = {
      reader: new JsonReader(bytes, bytes.length, false, raw),
      options: defaultOptions,
      stack: new Stack(),
    }

    const decodedValue = new TextDecoder().decode(bytes.subarray(start, end))
    const expectedResult = expected ?? JSON.parse(decodedValue)

    const value = meta.toValue(meta, ctx, start, depth)
    expect(value).toStrictEqual({
      type: ReadResultType.COMPLETE,
      value: expectedResult,
      nextIndex: end ? end : bytes.length
    })

    for (let i = 0; i < bytes.length; i++) {
      const chunks = [bytes.slice(0, i), bytes.slice(i, end)].reverse()
      const result = deserializePartially(meta, chunks)

      try {
        expect(result).toStrictEqual({
          type: ReadResultType.COMPLETE,
          value: expectedResult,
          nextIndex: chunks[0].length
        })
      } catch (error) {
        console.log('error on: ', i)
        throw error
      }
    }
  }

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
    expectError(bigInt(), 'abs')
  })
})