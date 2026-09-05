import { BaseMeta, JsonParsingContext, JsonParsingState } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { isNeedsMoreData, ReadResult, ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"

const encoder = new TextEncoder()
export function toBytes(str: string): Uint8Array<ArrayBuffer> {
    return encoder.encode(str)
}

export function expectError<M extends BaseMeta<any>>(options: {
    meta: M,
    raw?: string,
    bytes?: Uint8Array,
    index?: number,
    depth?: number
}) {
    let { meta, bytes, raw, index, depth } = options

    bytes ??= toBytes(raw ?? '')

    index ??= 0
    const reader = new JsonReader(bytes, bytes.length, false, raw)
    reader.setPosition(index)

    depth ??= 0
    const context: JsonParsingContext = new JsonParsingContext(reader, defaultOptions, new Stack())
    context.setDepth(depth)

    const result = meta.toValue(meta, context)
    expect(result).toStrictEqual({
        type: ReadResultType.ERROR,
        error: expect.any(JSONParseError)
    })

    if (raw !== undefined) {
        const reader = new JsonReader(bytes, bytes.length, false)
        reader.setPosition(index)
        const context: JsonParsingContext = new JsonParsingContext(reader, defaultOptions, new Stack())
        context.setDepth(depth)

        const rawlessResult = meta.toValue(meta, context)
        expect(rawlessResult).toStrictEqual({
            type: ReadResultType.ERROR,
            error: expect.any(JSONParseError)
        })
    }

    for (let i = 0; i < bytes.length; i++) {
        const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
        const result = deserializePartially(meta, chunks, index, depth)

        expect(result).toStrictEqual({
            type: ReadResultType.ERROR,
            error: expect.any(JSONParseError)
        })
    }
}

export const expectToParse = <M extends BaseMeta<any>>(
    options: {
        meta: M,
        raw?: string,
        bytes?: Uint8Array,
        start?: number,
        end?: number,
        depth?: number,
        expected?: any,
        alsoExpect?: (value: ReturnType<M['toValue']>) => void
    }) => {
    let { meta, raw, bytes, start, end, depth, expected, alsoExpect } = options

    bytes ??= toBytes(raw ?? '')
    start ??= 0
    depth ??= 0

    const reader = new JsonReader(bytes, bytes.length, false, raw)
    reader.setPosition(start)

    const ctx = new JsonParsingContext(reader, defaultOptions, new Stack())
    ctx.setDepth(depth)

    const decodedValue = new TextDecoder().decode(bytes.subarray(start, end))
    const expectedResult = expected ?? JSON.parse(decodedValue)

    const value = meta.toValue(meta, ctx)
    expect(value).toStrictEqual({
        type: ReadResultType.COMPLETE,
        value: expectedResult,
        nextIndex: end !== undefined ? end : bytes.length
    })
    reader.release()
    alsoExpect && alsoExpect(value as any)

    if (raw !== undefined) {
        const reader = new JsonReader(bytes, bytes.length, false)
        reader.setPosition(start)
        const ctx = new JsonParsingContext(reader, defaultOptions, new Stack())
        ctx.setDepth(depth)
        const rawlessValue = meta.toValue(meta, ctx)
        expect(rawlessValue).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expectedResult,
            nextIndex: end !== undefined ? end : bytes.length
        })
        reader.release()
        alsoExpect && alsoExpect(rawlessValue as any)
    }


    for (let i = 0; i < bytes.length; i++) {
        try {
            const chunks = [bytes.slice(0, i), bytes.slice(i, end)].reverse()
            const result = deserializePartially(meta, chunks, start, depth)

            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: expectedResult,
                nextIndex: chunks[0].length
            })

            alsoExpect && alsoExpect(result as any)
        } catch (error) {
            console.log('error on: ', i, expectedResult)
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

export function splitBytes(bytes: Uint8Array<ArrayBuffer>, numChunks: number) {
    const results: Uint8Array<ArrayBuffer>[] = []
    const n = bytes.length
    const positions: number[] = []

    function generateCombinations(start: number, depth: number) {
        if (depth === numChunks - 1) {
            for (let pos = start; pos < n; pos++) {
                const splits = [...positions, pos]
                const chunks = []
                let prev = 0

                for (const split of splits) {
                    chunks.push(bytes.slice(prev, split))
                    prev = split
                }
                chunks.push(bytes.slice(prev, n))

                results.push(...chunks)
            }
            return
        }

        for (let pos = start; pos < n - (numChunks - depth - 1); pos++) {
            positions.push(pos)
            generateCombinations(pos + 1, depth + 1)
            positions.pop()
        }
    }

    generateCombinations(1, 1)
    return results
}