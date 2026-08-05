import { BaseMeta, ParseContext, ParseState } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { Stack } from "../../src/utils/stack"
import { isNeedsMoreData } from "../../src/utils/types"

export const deserializePartially = <M extends BaseMeta<any, any>>(meta: M, chunks: Uint8Array[]) => {
    let result

    let currentChunk
    let prevChunk: number[] = []

    const stack = new Stack<ParseState>()

    while ((currentChunk = chunks.pop()) !== undefined) {
        const ch = [...prevChunk, ...currentChunk]
        const bytes = new Uint8Array(ch)

        const context: ParseContext = {
            reader: {
                bytes: bytes,
                writable: chunks.length !== 0
            },
            options: defaultOptions,
            stack: stack
        }
        result = meta.toValue(meta, context, 0, 0)

        if (isNeedsMoreData(result)) {
            prevChunk = [...currentChunk.slice(result.nextIndex)]
            continue
        }

        chunks[0] = bytes
        return result
    }
}