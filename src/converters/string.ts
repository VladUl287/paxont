import { BaseMeta, ConvertCtx, ConvertResult } from "../metadata/types"
import { DOUBLE_QUOTE as DQ } from "../utils/utf8constants"

let wasm: any = null
try {
    wasm = new WebAssembly.Instance(
        new WebAssembly.Module(
            new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 8, 1, 96, 3, 127, 127, 127, 1, 127, 3, 2, 1, 0, 5, 3, 1, 0, 1, 7, 24, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 11, 105, 110, 100, 101, 120, 79, 102, 83, 105, 109, 100, 0, 0, 10, 111, 1, 109, 3, 1, 127, 2, 123, 1, 127, 32, 2, 253, 15, 33, 4, 2, 64, 3, 64, 32, 3, 65, 16, 106, 32, 1, 75, 4, 64, 12, 2, 11, 32, 0, 32, 3, 106, 253, 0, 4, 0, 33, 5, 32, 5, 32, 4, 253, 35, 253, 100, 34, 6, 69, 13, 0, 32, 3, 32, 6, 104, 106, 15, 11, 2, 64, 3, 64, 32, 3, 32, 1, 73, 4, 64, 32, 0, 32, 3, 106, 45, 0, 0, 32, 2, 70, 4, 64, 32, 3, 15, 11, 32, 3, 65, 1, 106, 33, 3, 12, 1, 11, 11, 65, 127, 15, 11, 11, 65, 127, 11
            ]),
        ),
        {},
    ).exports
} catch { }

const wasmMem = new Uint8Array(wasm.memory.buffer)
const indexOfSimd = wasm.indexOfSimd as Function

export function toString(
    ctx: ConvertCtx, _meta: BaseMeta<string>, i: number, _depth: number): ConvertResult<string> {
    const b = ctx.bytes
    const len = b.length

    if (b[i] !== DQ)
        throw new Error("")
    i++

    let start = i

    // while (b[i] !== DQ && b[i + 1] !== DQ && b[i + 2] !== DQ && b[i + 3] !== DQ)
    //     i += 4

    // while (b[i] !== DQ)
    //     i++

    // i = b.indexOf(DOUBLE_QUOTE, i)

    // const stringValue = ctx.options.decoder.decode(b.subarray(start, i))

    const sub = ctx.bytes.subarray(i)
    wasmMem.set(sub, 0)
    const inde = indexOfSimd(0, sub.length, 34)
    i += inde

    return {
        value: i as any,
        nextIndex: ++i
    }
}

