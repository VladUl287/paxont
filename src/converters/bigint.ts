import { BaseMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { isDigitUnsafe } from "../utils/utf8constants"

export function toBigInt(ctx: ConvertCtx, meta: BaseMeta<bigint>, i: number, _depth: number): ConvertResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let start = i

    while (i < len - 4) {
        const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        i += 4
    }

    while (i < len && isDigitUnsafe(b[i])) i++

    const decoder = ctx.options.decoder
    const view = new Uint8Array(b.buffer, start, i - start)
    return {
        value: BigInt(decoder.decode(view)),
        nextIndex: i
    }
}
