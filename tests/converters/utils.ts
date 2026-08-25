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

    const reader = new JsonReader(bytes, bytes.length, false)
    const context: JsonParsingContext = new JsonParsingContext(reader, defaultOptions, new Stack())

    const result = meta.toValue(meta, context)

    expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })

    for (let i = 0; i < bytes.length; i++) {
        try {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        } catch (error) {
            console.log('error on: ', i)
            throw error
        }
    }
}

export const deserializePartially = <M extends BaseMeta<any>>(meta: M, chunks: Uint8Array[], index = 0, depth = 0) => {
    let result: ReadResult<any>

    let currentChunk
    let prevChunk: number[] = []

    const stack = new Stack<JsonParsingState>()

    const fullLength = chunks.reduce((acc, arr) => { return acc + arr.length }, 0)
    const bytes = new Uint8Array(fullLength)

    let i = index
    while ((currentChunk = chunks.pop()) !== undefined) {
        const ch = new Uint8Array([...prevChunk, ...currentChunk])
        ch.forEach((v, i) => bytes[i] = v)

        const reader = new JsonReader(bytes, ch.length, chunks.length !== 0)
        reader.setPosition(i)
        try {
            const context: JsonParsingContext = new JsonParsingContext(reader, defaultOptions, stack)
            context.setDepth(depth)

            result = meta.toValue(meta, context)

            if (isNeedsMoreData(result)) {
                prevChunk = [...currentChunk.slice(result.nextIndex)]
                i = 0
                continue
            }

        } finally {
            reader.release()
        }

        chunks[0] = ch
        return result
    }

    throw new Error('chunks not presented')
}