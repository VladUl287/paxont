import { BaseMeta, ConvertCtx, isObjectFieldMeta } from "../metadata/types"
import { A, E, F, L, R, S, T, U } from "../utils/utf8constants"

export function toBoolean(ctx: ConvertCtx, meta: BaseMeta<boolean>, index: number, _depth: number): boolean {
    const i = index
    const b = ctx.bytes
    const len = b.length

    if (i + 3 < len && b[i] === T && b[i + 1] === R && b[i + 2] === U && b[i + 3] === E)
        return true

    if (i + 4 < len && b[i] === F && b[i + 1] === A && b[i + 2] === L && b[i + 3] === S && b[i + 4] === E)
        return false

    if (isObjectFieldMeta(meta))
        throw new Error(`invalid boolean: field '${meta.name.value}', at index ${i}`)

    throw new Error(`invalid boolean, at index ${i}`)
}
