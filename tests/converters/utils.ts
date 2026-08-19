import { BaseMeta, JsonParsingContext, JsonParsingState } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { isNeedsMoreData, ReadResult, ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"

const encoder = new TextEncoder()
export function toBytes(str: string): Uint8Array {
    return encoder.encode(str)
}

export function expectError<M extends BaseMeta<any>>(meta: M, str: string) {
    const bytes = toBytes(str)

    const context: JsonParsingContext = {
        reader: new JsonReader(bytes, bytes.length, false),
        options: defaultOptions,
        stack: new Stack()
    }

    const result = meta.toValue(meta, context, 0, 0)

    expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })

    for (let i = 0; i < bytes.length; i++) {
        const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
        const result = deserializePartially(meta, chunks)
        expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
    }
}

export const deserializePartially = <M extends BaseMeta<any>>(meta: M, chunks: Uint8Array[]) => {
    let result: ReadResult<any>

    let currentChunk
    let prevChunk: number[] = []

    const stack = new Stack<JsonParsingState>()

    while ((currentChunk = chunks.pop()) !== undefined) {
        const ch = [...prevChunk, ...currentChunk]
        const bytes = new Uint8Array(ch)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, chunks.length !== 0),
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

    throw new Error('chunks not presented')
}