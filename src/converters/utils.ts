import { CARRIAGE_RETURN, NEW_LINE, SPACE, TAB } from "../utils/utf8constants"

const lookup = new Uint8Array(256)
lookup[TAB] = 1
lookup[SPACE] = 1
lookup[NEW_LINE] = 1
lookup[CARRIAGE_RETURN] = 1

export function skipWhitespace(b: Uint8Array, i: number): number {
    if (b[i] > SPACE) return i

    while (i < b.length && lookup[b[i]]) i++

    if (i < b.length && b[i] < SPACE)
        throw new Error(`Unexpected token ${String.fromCharCode(b[i])} at index ${i}`)

    return i
}