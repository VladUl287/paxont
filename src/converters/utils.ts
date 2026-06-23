import { CARRIAGE_RETURN, NEW_LINE, SPACE, TAB } from "../utils/utf8constants"

const lookup = new Uint8Array(256)
lookup[TAB] = 1
lookup[SPACE] = 1
lookup[NEW_LINE] = 1
lookup[CARRIAGE_RETURN] = 1

export const isWhitespace = (b: number) => lookup[b]

export function skipWhitespace(b: Uint8Array, i: number): number {
    if (b[i] > SPACE) return i

    while (true) {
        if (b[i] === SPACE) {
            const word = b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24

            if (word === 0x20202020) {
                i += 4
                continue
            }

            if ((word & 0xFFFF) === 0x2020) {
                i += 2
                continue
            }

            i++
            continue
        }
        else if (lookup[b[i]]) { i++ }
        else if (b[i] < SPACE) { throw new Error('Syntax error') }
        else break
    }

    return i
}