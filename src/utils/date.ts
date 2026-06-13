import { isDigit, isDigitU8, MINUS } from "./utf8constants";

export function isISO8601FromString(d: string): boolean {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:[+-]\d{2}:\d{2}|Z)$/
    return isoRegex.test(d)
}
export function isISO8601(b: Uint8Array, i: number): boolean {
    if (!(isDigitU8(b[i]) && isDigitU8(b[++i]) && isDigitU8(b[++i]) && isDigitU8(b[++i]))) //YYYY
        return false

    if (b[++i] !== MINUS)
        return false

    if (!(isDigitU8(b[++i]) && isDigitU8(b[++i]))) //MM
        return false

    if (b[++i] !== MINUS)
        return false

    if (!(isDigitU8(b[++i]) && isDigitU8(b[++i])))
        return false

    return true
}