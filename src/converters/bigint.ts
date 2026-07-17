import { JsonReader, PrimitiveMeta } from "../metadata/types"
import { isDigitUnsafe } from "../utils/utf8constants"
import { ReadResult } from "../utils/types"

type State = { lastIndex?: number }

const unsafeDecoder = new TextDecoder('utf-8', { fatal: false })

export function tryParseBigInt(
    ctx: JsonReader, _m: PrimitiveMeta<bigint>, i: number, _d: number, state: State): ReadResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let start = i
    i = state.lastIndex ?? i

    while (i < len - 4) {
        const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        i += 4
    }

    while (i < len && isDigitUnsafe(b[i])) i++

    if (i === len && ctx.writable) {
        state.lastIndex = i
        return {
            nextIndex: start
        }
    }

    const view = new Uint8Array(b.buffer, start, i - start)
    return {
        value: BigInt(unsafeDecoder.decode(view)),
        nextIndex: i
    }
}
