import { ReadResult } from "../utils/types"
import { JsonReader, PrimitiveMeta } from "../metadata/types"
import { parseFloat32, parseFloat64, parseInt16, parseInt32, parseInt64, parseInt8, parseUint16, parseUint32, parseUint64, parseUint8 } from "../utils/number"

export const toInt8 = (ctx: JsonReader, m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseInt8(ctx.bytes, i)

export const toUInt8 = (ctx: JsonReader, m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseUint8(ctx.bytes, i)

export const toInt16 = (ctx: JsonReader, m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseInt16(ctx.bytes, i)

export const toUint16 = (ctx: JsonReader, m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseUint16(ctx.bytes, i)

export const toInt32 = (ctx: JsonReader, m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseInt32(ctx.bytes, i)

export const toUint32 = (ctx: JsonReader, m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseUint32(ctx.bytes, i)

export const toInt64 = (ctx: JsonReader, _m: PrimitiveMeta<bigint>, i: number, _d: number): ReadResult<bigint> =>
    parseInt64(ctx.bytes, i)

export const toUInt64 = (ctx: JsonReader, _m: PrimitiveMeta<bigint>, i: number, _d: number): ReadResult<bigint> =>
    parseUint64(ctx.bytes, i)

export const toFloat32 = (ctx: JsonReader, _m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseFloat32(ctx.bytes, i)

export const toFloat64 = (ctx: JsonReader, _m: PrimitiveMeta<number>, i: number, _d: number): ReadResult<number> =>
    parseFloat64(ctx.bytes, i)
