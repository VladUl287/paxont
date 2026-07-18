import { createCache } from "./cache/cache"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta } from "./metadata/types"
import { createFactory } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { useMetadata } from "./metadata"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()
const defaultMetadata = useMetadata()

const buffer = createFactory(Uint8Array)

type MetaOrObject<T> = T extends BaseMeta<infer V, any> ? V : T

export function deserialize<T>(json: ArrayBuffer | Uint8Array | string, type: T, options?: Partial<JsonOptions>): MetaOrObject<T> {
    const fullOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const metadata = isMetadata(type) ? type : defaultMetadata.toMetadata(type)

    let bytes: Uint8Array

    const isString = typeof json === 'string'
    if (isString) {
        const length = getMaxBytesCount(json.length)
        bytes = buffer(length)
        fullOptions.encoder.encodeInto(json, bytes)
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

    const result = metadata.toValue({
        bytes,
        writable: false,
        options: fullOptions,
    }, metadata, 0, 0, {})

    if (result.value === undefined) {
        throw new Error('')
    }

    return result.value
}

export function deserializeAsync<T>(json: ReadableStream<Uint8Array>, type: T, options?: Partial<JsonOptions>): Promise<MetaOrObject<T>> {
    return new Promise(() => { })
}

export function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
    const fullOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    return metadata.toJson(value, metadata, fullOptions)
}
