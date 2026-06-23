import { CARRIAGE_RETURN, NEW_LINE, SPACE, TAB } from "../utils/utf8constants"

const lookup = new Uint8Array(256)
lookup[TAB] = 1
lookup[SPACE] = 1
lookup[NEW_LINE] = 1
lookup[CARRIAGE_RETURN] = 1

export const isWhitespace = (b: number) => lookup[b]

export function skipWhitespace(bytes: Uint8Array, i: number): number {
    if (bytes[i] > SPACE) return i

    const FOUR_SPACES = 0x20202020
    const TWO_SPACES = 0x20202020

    while (true) {
        const b = bytes[i]
        if (b === SPACE) {
            const word = bytes[i] | bytes[i + 1] << 8 | bytes[i + 2] << 16 | bytes[i + 3] << 24

            if (word === FOUR_SPACES) {
                i += 4
                continue
            }

            if ((word & 0xFFFF) === TWO_SPACES) {
                i += 2
                continue
            }

            i++
        }
        else if (lookup[b]) { i++ }
        else { break }
    }

    return i
}