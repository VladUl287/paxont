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

export const deserializePartially = <M extends BaseMeta<any>>(meta: M, chunks: Uint8Array[], depth = 0) => {
    let result: ReadResult<any>

    let currentChunk
    let prevChunk: number[] = []

    const stack = new Stack<JsonParsingState>()

    const fullLength = chunks.reduce((acc, arr) => { return acc + arr.length }, 0)
    const bytes = new Uint8Array(fullLength)

    while ((currentChunk = chunks.pop()) !== undefined) {
        const ch = new Uint8Array([...prevChunk, ...currentChunk])
        ch.forEach((v, i) => bytes[i] = v)

        const reader = new JsonReader(bytes, ch.length, chunks.length !== 0)
        try {
            const context: JsonParsingContext = {
                reader: reader,
                options: defaultOptions,
                stack: stack
            }
            result = meta.toValue(meta, context, 0, depth)
            
            if (isNeedsMoreData(result)) {
                prevChunk = [...currentChunk.slice(result.nextIndex)]
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