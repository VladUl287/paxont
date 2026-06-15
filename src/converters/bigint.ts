import { BaseMeta, ConvertCtx, isObjectFieldMeta } from "../metadata/types"
import { isDigitU8 } from "../utils/utf8constants"
import { ConvertResult } from "./types"

export function toBigInt(ctx: ConvertCtx, meta: BaseMeta<bigint>, index: number, _depth: number): ConvertResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let start = index
    let i = index

    while (i < len - 4) {
        const a1 = b[i]
        const a2 = b[i + 1]
        const a3 = b[i + 2]
        const a4 = b[i + 3]

        const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
        const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

        if (hasNonDigit !== 0) break

        i += 4
    }

    while (i < len && isDigitU8(b[i])) i++

    const segment = b.subarray(start, i)
    const segmentStr = ctx.options.decoder.decode(segment)
    return {
        value: BigInt(segmentStr),
        nextIndex: i
    }
}

