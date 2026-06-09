import * as JsonCodes from '../src/utils/utf8constants'
import { Bench } from 'tinybench'

const suite = new Bench({ name: 'is_whitespace', warmupIterations: 200 })

const bytes = new TextEncoder().encode("          _")

const isWhitespaceOr = (byte: number) =>
    byte === JsonCodes.SPACE || byte === JsonCodes.NEW_LINE ||
    byte === JsonCodes.TAB || byte === JsonCodes.CARRIAGE_RETURN

const isWhitespaceBitMap = new Uint8Array(256)
isWhitespaceBitMap[JsonCodes.SPACE] = 1
isWhitespaceBitMap[JsonCodes.NEW_LINE] = 1
isWhitespaceBitMap[JsonCodes.TAB] = 1
isWhitespaceBitMap[JsonCodes.CARRIAGE_RETURN] = 1

const isWhitespaceMap = (byte: number) => isWhitespaceBitMap[byte]

const WS_BITMASK =
    (1 << JsonCodes.SPACE) | (1 << JsonCodes.NEW_LINE) |
    (1 << JsonCodes.TAB) | (1 << JsonCodes.CARRIAGE_RETURN)

const isWhitespaceMask = (byte: number) => (WS_BITMASK >> byte) & 1

suite
    .add('or-symbol', () => isWhitespaceOr(bytes[0]))
    .add('bitmap-symbol', () => isWhitespaceMap(bytes[0]))
    .add('bitmask-symbol', () => isWhitespaceMask(bytes[0]))
    .add('or', () => {
        let i = 0
        while (isWhitespaceOr(bytes[i])) i++
        return i
    })
    .add('bitmap', () => {
        let i = 0
        while (isWhitespaceMap(bytes[i])) i++
        return i
    })
    .add('bitmask', () => {
        let i = 0
        while (isWhitespaceMask(bytes[i])) i++
        return i
    })

suite.run().then(() => {
    console.log(suite.name)
    console.table(suite.table())
})

