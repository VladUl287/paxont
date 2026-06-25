import { Metadata } from "./metadata/metadata"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { createCache } from "./cache/cache"
import { BaseMeta } from "./metadata/types"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()

export function deserialize2<T, U = T>(
    json: Uint8Array | string,
    type: T,
    options?: Partial<JsonOptions>
): T extends BaseMeta<infer V, any> ? V : U {
    return {} as any
}

export function deserialize1<T>(json: string, meta: Metadata, options?: Partial<JsonOptions>): T {
    const opts = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const result = meta.convert({
        bytes: opts.encoder.encode(json),
        options: opts
    }, meta, 0, 0)

    return result.value as T
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

export function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
    return ''
}