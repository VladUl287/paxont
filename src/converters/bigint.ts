import { ConvertState, JsonReader, PrimitiveMeta } from "../metadata/types"
import { isDigitUnsafe } from "../utils/utf8constants"
import { ReadResult, ReadResultType } from "../utils/types"
import { JSONParseError } from "../utils/error"

type BigIntState = ConvertState & { lastIndex?: number }

const COMPLETE = ReadResultType.COMPLETE
const ERROR = ReadResultType.ERROR
const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA

export function tryParseBigInt(
    _m: PrimitiveMeta<bigint>, ctx: JsonReader, i: number, _d: number, state: BigIntState): ReadResult<bigint> {
    const b = ctx.bytes
    const len = b.length

    let start = i
    if (state.isContinued)
        i = state.lastIndex ?? i

    try {
        while (i < len - 4) {
            const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

            const word = (a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24) - 0x30303030
            const hasNonDigit = ((word + 0x76767676) | word) & 0x80808080

            if (hasNonDigit !== 0) break

            i += 4
        }

        while (i < len && isDigitUnsafe(b[i])) i++

        if (i === len && ctx.writable) {
            state.isContinued = true
            state.lastIndex = i

            return {
                type: NEEDS_MORE_DATA,
                nextIndex: start
            }
        }

        const length = i - start
        if (length <= 0) {
            return {
                type: ERROR,
                error: new JSONParseError(
                    `Expected at least one digit at index ${i}, but found '${String.fromCharCode(b[i])}' while parsing bigint`, i)
            }
        }

        const decoder = ctx.options.decoder
        const view = new Uint8Array(b.buffer, start, i - start)
        return {
            type: COMPLETE,
            value: BigInt(decoder.decode(view)),
            nextIndex: i
        }
    }
    catch (error) {
        return {
            type: ReadResultType.ERROR,
            error: new JSONParseError(
                `Unexpected error while parsing bigint at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
                i, { cause: error })
        }
    }
    finally {
        if (state.isContinued) {
            state.isContinued = false
            state.lastIndex = 0
        }
    }
}
