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

type MetaOrObject<T> = T extends BaseMeta<infer V, any> ? V : T

const stackMock: Stack<ConvertState> = {
    stack: [],
    length: 0,
    isEmpty: true,
    pop: () => undefined,
    push: (_value) => { },
    ensureLength: (_length: number) => { }
} as Partial<Stack<ConvertState>> as Stack<ConvertState>

export function deserialize<T>(json: ArrayBuffer | Uint8Array | string, type: T, options?: Partial<JsonOptions>): MetaOrObject<T> {
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
        throw new Error()
    }

    const result = metadata.tryParseValue(metadata, {
        options: filledOptions,
        reader: {
            bytes,
            writable: false
        },
        stack: stackMock,
    }, 0, 0)

    if (isError(result))
        throw result.error

    if (isNeedsMoreData(result))
        throw new Error()

    return result.value
}

export function deserializeAsync<T>(json: ReadableStream<Uint8Array>, type: T, options?: Partial<JsonOptions>): Promise<MetaOrObject<T>> {
    return new Promise(() => { })
}

export function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
    const fullOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    return metadata.toJson(metadata, value, fullOptions)
}
