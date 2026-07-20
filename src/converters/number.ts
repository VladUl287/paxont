import { ReadResult } from "../utils/types"
import { ConvertState, JsonReader, PrimitiveMeta } from "../metadata/types"
import {
    parseFloat32, parseFloat64, parseInt16, parseInt32,
    parseInt64, parseInt8, parseUint16, parseUint32,
    parseUint64, parseUint8
} from "../utils/number"

export const toInt8 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseInt8(ctx.bytes, i)

export const toUInt8 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseUint8(ctx.bytes, i)

export const toInt16 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseInt16(ctx.bytes, i)

export const toUint16 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseUint16(ctx.bytes, i)

export const toInt32 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseInt32(ctx.bytes, i)

export const toUint32 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseUint32(ctx.bytes, i)

export const toInt64 = (
    _m: PrimitiveMeta<bigint>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<bigint> =>
    parseInt64(ctx.bytes, i)

export const toUInt64 = (
    _m: PrimitiveMeta<bigint>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<bigint> =>
    parseUint64(ctx.bytes, i)

export const toFloat32 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseFloat32(ctx.bytes, i)

export const toFloat64 = (
    _m: PrimitiveMeta<number>, ctx: JsonReader, i: number, _d: number, _s: ConvertState
): ReadResult<number> =>
    parseFloat64(ctx.bytes, i)
