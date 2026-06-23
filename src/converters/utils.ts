import { CARRIAGE_RETURN, NEW_LINE, SPACE, TAB } from "../utils/utf8constants"

const lookup = new Uint8Array(256)
lookup[TAB] = 1
lookup[SPACE] = 1
lookup[NEW_LINE] = 1
lookup[CARRIAGE_RETURN] = 1

export const isWhitespace = (b: number) => lookup[b]

export function skipWhitespace(b: Uint8Array, i: number): number {
    if (b[i] > SPACE) return i
    while (lookup[b[i]]) i++
    return i
}