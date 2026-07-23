import { CacheFactory, createCache } from "./cache/cache"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, ConvertState } from "./metadata/types"
import { ArrayPool, ArrayRecycler, useArrayRecycler } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { MetadataBuilder, useMetadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/types"
import { Stack } from "./utils/structs"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()
const metadataCache = createCache<any, BaseMeta<any, any>>()

const defaultMetadata = useMetadata()

const recycler = useArrayRecycler<Uint8Array<ArrayBufferLike>>(Uint8Array)

const defaultStack = new Stack<ConvertState>()

type ExtractType<T> = T extends BaseMeta<infer V, any> ? V : T

export function useJSONT(value: {
    metadataBuilder: MetadataBuilder,
    cacheFactory: CacheFactory,
    recycler: ArrayRecycler<Uint8Array>,
    pool: ArrayPool<Uint8Array>,
    jsonOptions: {
        defaultOptions: JsonOptions,
        mergetOptions: Function
    },
    result: {
        isComplete: Function,
        isError: Function,
        isNeedsMoreData: Function,
    }
}) {
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

function toBytes(
    input: ArrayBuffer | Uint8Array | string,
    recycler: ArrayRecycler<Uint8Array>,
    { encoder }: JsonOptions
): Uint8Array {
    if (typeof input === 'string') {
        const length = getMaxBytesCount(input.length)
        const bytes = recycler.acquire(length)
        encoder.encodeInto(input, bytes)
        return bytes
    }

    if (input instanceof ArrayBuffer)
        return new Uint8Array(input)

    if (input instanceof Uint8Array)
        return input

    throw new Error(
        `Invalid input type: expected string, ArrayBuffer, or Uint8Array, but received ${input === null ? 'null' : typeof input}`)
}

export function deserialize<T>(
    json: ArrayBuffer | Uint8Array | string,
    type: T,
    options?: Partial<JsonOptions>
): ExtractType<T> {
    const filledOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const metadata = !isMetadata(type) ?
        metadataCache.getOrAdd(type, (t) => defaultMetadata.toMetadata(t)) :
        type

    const bytes = toBytes(json, recycler, filledOptions)

    const result = metadata.toValue(metadata, {
        options: filledOptions,
        reader: {
            bytes,
            writable: false
        },
        stack: defaultStack,
    }, 0, 0)

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
