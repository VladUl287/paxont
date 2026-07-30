import { MemoFactory, memo } from "./utils/memo"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, ParseState } from "./metadata/types"
import { ArrayPool, createArrayPool } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { Metadata, metadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/types"
import { Stack } from "./utils/stack"

type MetaOrData<T> = T extends BaseMeta<infer V, any> ? V : T

type JSONTOptions = {
    readonly metadataBuilder: Metadata
    readonly arrayPool: ArrayPool<Uint8Array>
    readonly jsonOptions: {
        readonly defaultOptions: JsonOptions
        readonly mergetOptions: typeof mergeOptions
    }
    readonly memo: MemoFactory
}

const defaultJsontOptions: JSONTOptions = Object.freeze({
    metadataBuilder: metadata(),
    arrayPool: createArrayPool<Uint8Array<ArrayBufferLike>>(Uint8Array),
    jsonOptions: {
        defaultOptions: defaultOptions,
        mergetOptions: mergeOptions
    },
    memo,
})

export function jsont(value: JSONTOptions = defaultJsontOptions) {
    const { arrayPool, memo } = value

    const optionsCache = memo<Partial<JsonOptions>, JsonOptions>()
    const metadataCache = memo<any, BaseMeta<any, any>>()

    const defaultMetadata = metadata()

    const defaultStack = new Stack<ParseState>()

    function deserialize<T>(
        value: ArrayBuffer | Uint8Array | string,
        type: T,
        options?: Partial<JsonOptions>
    ): MetaOrData<T> {
        const filledOptions = !!options ?
            optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataCache.getOrAdd(type, (t) => defaultMetadata.from(t)) :
            type

        let bytes: Uint8Array

        const isString = typeof value === 'string'
        if (isString) {
            const length = getMaxBytesCount(value.length)
            bytes = arrayPool.rent(length)
            filledOptions.encoder.encodeInto(value, bytes)
        }
        else if (value instanceof ArrayBuffer)
            bytes = new Uint8Array(value)
        else if (value instanceof Uint8Array)
            bytes = value
        else
            throw new Error(
                `Invalid input type: expected string, ArrayBuffer, or Uint8Array, but received ${value === null ? 'null' : typeof value}`)

        const result = metadata.toValue(metadata, {
            options: filledOptions,
            reader: {
                bytes,
                writable: false
            },
            stack: defaultStack,
        }, 0, 0)

        if (isString)
            arrayPool.release(bytes)

        if (isError(result))
            throw result.error

        if (isNeedsMoreData(result))
            throw new Error(`Incomplete JSON: sync parser expects full data.
            In sync mode, data cannot be streamed - custom parser must receive complete data at once`)

        return result.value
    }

    async function deserializeAsync<T>(
        json: ReadableStream<Uint8Array>,
        type: T,
        options?: Partial<JsonOptions>
    ): Promise<MetaOrData<T>> {
        const filledOptions = !!options ?
            optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataCache.getOrAdd(type, (t) => defaultMetadata.from(t)) :
            type

        const stack = new Stack<ParseState>()

        const reader = json.getReader()

        while (!reader.closed) {
            const chunk = await reader.read()
            const value = chunk.value

            if (!value)
                break

            const result = metadata.toValue(metadata, {
                options: filledOptions,
                reader: {
                    bytes: value,
                    writable: !chunk.done
                },
                stack
            }, 0, 0)

            if (isError(result))
                throw result.error

            if (isNeedsMoreData(result))
                continue

            return result.value
        }

        throw new Error()
    }

    function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
        const fullOptions = !!options ?
            optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
            defaultOptions

        return metadata.toJson(metadata, value, fullOptions)
    }

    return {
        deserialize,
        deserializeAsync,
        serialize
    }
}

export const { deserialize, deserializeAsync, serialize } = jsont(defaultJsontOptions)