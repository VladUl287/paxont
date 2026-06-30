import { createCache } from "./cache/cache"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, isMeta, useMetadata } from "./metadata/types"
import { createFactory } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()
const defaultMetadata = useMetadata()

const buffer = createFactory(Uint8Array)

export type BinaryInput = ArrayBuffer | Uint8Array | string

export function deserialize<T>(
    json: BinaryInput, type: T, options?: Partial<JsonOptions>
): T extends BaseMeta<infer V, any> ? V : T {
    const fullOptions = !!options ?
        optionsCache.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
        defaultOptions

    const metadata = isMeta(type) ? type : defaultMetadata.toMetadata(type)

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
        raw: isString ? json : undefined,
        bytes,
        options: fullOptions
    }, metadata, 0, 0)

    return result.value
}

export function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
    return metadata.toJson(value, metadata)
}
