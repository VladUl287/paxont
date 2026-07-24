import { CacheFactory, createCache } from "./cache/cache"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, ConvertState } from "./metadata/types"
import { ArrayPool, useArrayPool } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { MetadataFactory, useMetadata } from "./metadata"
import { isComplete, isError, isNeedsMoreData } from "./utils/types"
import { Stack } from "./utils/stack"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()
const metadataCache = createCache<any, BaseMeta<any, any>>()

const defaultMetadata = useMetadata()

const pool = useArrayPool<Uint8Array<ArrayBufferLike>>(Uint8Array)

const defaultStack = new Stack<ConvertState>()

type ExtractType<T> = T extends BaseMeta<infer V, any> ? V : T

type JSONTOptions = {
    readonly metadataBuilder: MetadataFactory
    readonly arrayPool: ArrayPool<Uint8Array<ArrayBuffer>>
    readonly jsonOptions: {
        readonly defaultOptions: JsonOptions
        readonly mergetOptions: typeof mergeOptions
    }
    readonly result: {
        isComplete: Function
        isError: Function
        isNeedsMoreData: Function
    }
    readonly createCache: CacheFactory
}

const defaultJSONTOptions: JSONTOptions = Object.freeze({
    metadataBuilder: useMetadata(),
    arrayPool: useArrayPool(Uint8Array),
    jsonOptions: {
        defaultOptions: defaultOptions,
        mergetOptions: mergeOptions
    },
    result: {
        isComplete: isComplete,
        isError: isError,
        isNeedsMoreData: isNeedsMoreData
    },
    createCache: createCache,
})

export function useJSONT(value: JSONTOptions = defaultJSONTOptions) {
    function deserialize<T>(
        json: ArrayBuffer | Uint8Array | string,
        type: T,
        options?: Partial<JsonOptions>
    ): ExtractType<T> { return {} as any }

    async function deserializeAsync<T>(
        json: ReadableStream<Uint8Array>,
        type: T,
        options?: Partial<JsonOptions>
    ): Promise<ExtractType<T>> { return {} as any }

    function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
        return {} as any
    }

    return {
        deserialize,
        deserializeAsync,
        serialize
    }
}

export function deserialize<T>(
    value: ArrayBuffer | Uint8Array | string,
    type: T,
    options?: Partial<JsonOptions>
): ExtractType<T> {
    const filledOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const metadata = !isMetadata(type) ?
        metadataCache.getOrAdd(type, (t) => defaultMetadata.toMetadata(t)) :
        type

    let bytes: Uint8Array

    const isString = typeof value === 'string'
    if (isString) {
        const length = getMaxBytesCount(value.length)
        bytes = pool.rent(length)
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
        pool.release(bytes)

    if (isError(result))
        throw result.error

    if (isNeedsMoreData(result))
        throw new Error(`Incomplete JSON: sync parser expects full data.
            In sync mode, data cannot be streamed - custom parser must receive complete data at once`)

    return result.value
}

export async function deserializeAsync<T>(
    json: ReadableStream<Uint8Array>,
    type: T,
    options?: Partial<JsonOptions>
): Promise<ExtractType<T>> {
    const filledOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const metadata = !isMetadata(type) ?
        metadataCache.getOrAdd(type, (t) => defaultMetadata.toMetadata(t)) :
        type

    const stack = new Stack<ConvertState>()

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

export function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
    const fullOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    return metadata.toJson(metadata, value, fullOptions)
}
