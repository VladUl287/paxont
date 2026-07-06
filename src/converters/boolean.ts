import { ConvertCtx, PrimitiveMeta } from "../metadata/types"
import { E } from "../utils/utf8constants"
import { ReadResult } from "../utils/types"

export function toBoolean(
    ctx: ConvertCtx, _m: PrimitiveMeta<boolean>, i: number, _d: number, state: Record<string, undefined>
): ReadResult<boolean> {
    const b = ctx.bytes
    const len = b.length

    let ch = 0

    const TRUE = 0x65757274
    if (i + 3 < len && (ch = (b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24)) === TRUE)
        return {
            value: true,
            nextIndex: i + 4
        }

    const FALSE = 0x736c6166
    if (i + 4 < len && ch === FALSE && b[i + 4] === E)
        return {
            value: false,
            nextIndex: i + 5
        }

    if (ctx.finished) {
        throw new Error(`invalid boolean, at index ${i}`)
    }

    return {
        nextIndex: i
    }
}
