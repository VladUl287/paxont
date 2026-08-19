import { memoize } from "./utils/memo"
import { defaultOptions, JsonOptions } from "./options"
import { BaseMeta, JsonParsingState } from "./metadata/types"
import { arrayPool } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMeta } from "./metadata/utils"
import { metadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/result"
import { IStack, Stack } from "./utils/stack"
import { JsontOptions, MetaOrData } from "./types"
import { JsonReader } from "./utils/reader"

const defaultJsontOptions: JsontOptions = Object.freeze({
    metadata: metadata(),
    bufferPool: arrayPool<Uint8Array<ArrayBuffer>>(Uint8Array, 0),
    defaultSerializeOptions: defaultOptions,
    memoize: memoize,
})

export function jsont(options: Partial<JsontOptions> = defaultJsontOptions) {
    const { metadata, memoize, bufferPool, defaultSerializeOptions } = <JsontOptions>{
        ...defaultJsontOptions,
        ...options
    }

    const optionsMemo = memoize<Partial<JsonOptions>, JsonOptions>()
    const metadataMemo = memoize<any, BaseMeta<any>>()

    const stack: IStack<JsonParsingState> = Object.freeze({
        isEmpty: true,
        pop: () => undefined,
        peek: () => undefined,
        push: () => { }
    })

    function deserialize<T>(
        value: ArrayBuffer | Uint8Array<ArrayBuffer> | string,
        type: T,
        options?: Partial<JsonOptions>
    ): MetaOrData<T> {
        const fullOptions = options === undefined ?
            defaultSerializeOptions :
            optionsMemo.getOrAdd(options, (o) => ({ ...defaultSerializeOptions, ...o }))
        const metadataType = isMeta(type) ?
            type :
            metadataMemo.getOrAdd(type, (t) => metadata.from(t))

        let bytes: Uint8Array<ArrayBuffer>
        let bytesLength: number = 0

        const isString = typeof value === 'string'
        if (isString) {
            const length = getMaxBytesCount(value.length)
            bytes = bufferPool.rent(length)
            const { written } = fullOptions.encoder.encodeInto(value, bytes)
            bytesLength = written
        }
        else if (value instanceof ArrayBuffer) {
            bytes = new Uint8Array(value)
            bytesLength = bytes.length
        }
        else if (value instanceof Uint8Array) {
            bytes = value
            bytesLength = bytes.length
        }
        else {
            throw new TypeError(`Invalid input type: expected string, ArrayBuffer, or Uint8Array, but received ${typeof value}`)
        }

        const reader = new JsonReader(bytes, bytesLength, false, isString ? value : undefined)
        try {
            const result = metadataType.toValue(metadataType, { options: fullOptions, reader, stack }, 0, 0)

            if (isError(result)) {
                throw result.error
            }

            if (isNeedsMoreData(result)) {
                throw new Error(`Incomplete JSON: sync parser expects full data. ` +
                    `In sync mode, data cannot be streamed - custom parser must receive complete data at once`)
            }

            return result.value
        }
        finally {
            reader.release()
            if (isString) {
                bufferPool.release(bytes)
            }
        }
    }

    async function deserializeAsync<T>(
        json: ReadableStream<Uint8Array>,
        type: T,
        options?: Partial<JsonOptions>
    ): Promise<MetaOrData<T>> {
        const fullOptions = options === undefined ?
            defaultSerializeOptions :
            optionsMemo.getOrAdd(options, (o) => ({ ...defaultSerializeOptions, ...o }))

        const metadataType = isMeta(type) ?
            type :
            metadataMemo.getOrAdd(type, (key) => metadata.from(key))

        const stack = new Stack<JsonParsingState>()

        const binaryReader = json.getReader({ mode: 'byob' })
        const tempBuffer = bufferPool.rent(65536)
        const reader = new JsonReader(tempBuffer, tempBuffer.length, true)

        let start = 0
        try {
            while (true) {
                const { value, done } = await binaryReader.read(tempBuffer.subarray(start))

                if (value === undefined) { break }

                reader.setLength(start + value.length)
                done && reader.close()

                const result = metadataType.toValue(metadataType, { options: fullOptions, reader, stack }, 0, 0)

                if (isError(result)) {
                    throw result.error
                }

                if (isNeedsMoreData(result)) {
                    if (done) { break }

                    tempBuffer.copyWithin(0, result.nextIndex, tempBuffer.length)
                    start = result.nextIndex
                    continue
                }

                return result.value
            }

            throw new Error()
        } finally {
            reader.release()
            bufferPool.release(tempBuffer)
        }
    }

    function serialize<V, T>(value: V, type: T, options?: Partial<JsonOptions>): string {
        const fullOptions = options === undefined ?
            defaultSerializeOptions :
            optionsMemo.getOrAdd(options, (o) => ({ ...defaultSerializeOptions, ...o }))

        const metadataType = isMeta(type) ?
            type :
            metadataMemo.getOrAdd(type, (key) => metadata.from(key))

        return metadataType.toJson(metadataType, value, fullOptions)
    }

    return {
        deserialize,
        deserializeAsync,
        serialize
    }
}

export const { deserialize, deserializeAsync, serialize } = jsont()