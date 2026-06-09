import * as JsonCodes from "../utils/utf8constants"

const WS_BITMASK =
    (1 << JsonCodes.SPACE) | (1 << JsonCodes.NEW_LINE) |
    (1 << JsonCodes.TAB) | (1 << JsonCodes.CARRIAGE_RETURN)

export const isWhitespace = (byte: number) => (WS_BITMASK >> byte) & 1

export function skipWhitespace(bytes: Uint8Array, i: number): number {
    while (isWhitespace(bytes[i])) i++
    return i
}
