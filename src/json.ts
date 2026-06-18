import { Metadata } from "./metadata/metadata"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { createCache } from "./cache/cache"
import { BaseMeta } from "./metadata/types"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()

export function deserialize1<T, M extends BaseMeta<T> = BaseMeta<T>>(
    json: Uint8Array,
    meta: M | T,
    options?: Partial<JsonOptions>
): T {
    return {} as any
}

export function deserialize<T>(json: Uint8Array, meta: Metadata, options?: Partial<JsonOptions>): T {
    const opts = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const result = meta.convert({
        bytes: json,
        options: opts
    }, meta, 0, 0)

    return result.value as T
}
