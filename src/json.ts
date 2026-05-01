import { isError } from "./converters/types"
import { Metadata } from "./metadata/metadata"
import { defaultOptions, JsonOptions, mergerOptions } from "./options/types"
import { createCache } from "./cache/cache"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()

export function deserialize<T>(json: Uint8Array<ArrayBuffer>, metadata: Metadata, options?: Partial<JsonOptions>): T {
    const opts = !!options ?
        optionsCache.getOrAdd(options, (key) => mergerOptions(defaultOptions, key)) :
        defaultOptions

    const result = metadata.convert({
        bytes: json,
        options: opts
    }, metadata, 0, 0)

    if (isError(result))
        throw new Error(result.error)

    return result.value as T
}
