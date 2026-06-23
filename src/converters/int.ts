import { BaseMeta, ConvertCtx } from "../metadata/types"
import { parseInt16, parseInt32, parseInt64, parseInt8, parseUint16, parseUint32, parseUint64, parseUint8 } from "../utils/number"
import { ReadResult } from "../utils/types"

export const toInt = (ctx: ConvertCtx, m: BaseMeta<number>, i: number, _d: number): ReadResult<number> => {
    const b = ctx.bytes

    switch (m.type) {
        case 'i8': return parseInt8(b, i)
        case 'u8': return parseUint8(b, i)

        case 'i16': return parseInt16(b, i)
        case 'u16': return parseUint16(b, i)

        case 'i32': return parseInt32(b, i)
        case 'u32': return parseUint32(b, i)

        default: throw new Error(`Unsupported number type '${m.type}' at index ${i}`);
    }
}

export const toInt64 = (ctx: ConvertCtx, _m: BaseMeta<bigint>, i: number, _d: number): ReadResult<bigint> =>
    parseInt64(ctx.bytes, i)

export const toUInt64 = (ctx: ConvertCtx, _m: BaseMeta<bigint>, i: number, _d: number): ReadResult<bigint> =>
    parseUint64(ctx.bytes, i)
