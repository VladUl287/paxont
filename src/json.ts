import { createCache } from "./cache/cache"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, ConvertState } from "./metadata/types"
import { useArrayRecycler } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { useMetadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/types"
import { Stack } from "./utils/structs"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()
const metadataCache = createCache<any, BaseMeta<any, any>>()

const defaultMetadata = useMetadata()

const recycler = useArrayRecycler(Uint8Array)

const defaultStack = new Stack<ConvertState>()

type ExtractType<T> = T extends BaseMeta<infer V, any> ? V : T

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

    let bytes: Uint8Array
    if (typeof json === 'string') {
        const length = getMaxBytesCount(json.length)
        bytes = recycler.acquire(length)
        filledOptions.encoder.encodeInto(json, bytes)
    }
    else if (json instanceof ArrayBuffer) {
        bytes = new Uint8Array(json)
    }
    else if (json instanceof Uint8Array) {
        bytes = json
    }
    else {
        throw new Error(
            `Invalid input type: expected string, ArrayBuffer, or Uint8Array, but received ${json === null ? 'null' : typeof json}`)
    }

    const result = metadata.tryParseValue(metadata, {
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
        throw new Error()

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

        const result = metadata.tryParseValue(metadata, {
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
