import { createCache } from "./cache/cache"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, isMeta, useMetadata } from "./metadata/types"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()
const defaultMetadata = useMetadata()

export function deserialize2<T>(
    json: Uint8Array | string,
    type: T,
    options?: Partial<JsonOptions>
): T extends BaseMeta<infer V, any> ? V : T {
    const fullOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const metadata = isMeta(type) ? type : defaultMetadata.toMetadata(type)

    const bytes = json instanceof Uint8Array ? json : fullOptions.encoder.encode(json)

    const result = metadata.toValue({
        bytes,
        options: fullOptions
    }, metadata, 0, 0)

    return result.value
}

export function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
    return metadata.toJson(value, metadata)
}