import { BaseMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { parseFloat32, parseFloat64 } from "../utils/number"

export const toFloat32 = (ctx: ConvertCtx, _m: BaseMeta<number>, i: number, _d: number): ConvertResult<number> =>
    parseFloat32(ctx.bytes, i)

export const toFloat64 = (ctx: ConvertCtx, _m: BaseMeta<number>, i: number, _d: number): ConvertResult<number> =>
    parseFloat64(ctx.bytes, i)
