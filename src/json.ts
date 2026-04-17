import { ConvertMeta, ConvertResult, ConvertState, isError, isMultiMeta, isSuccess } from "./converters/types"
import { Metadata } from "./metadata/metadata"
import { defaultOptions, JsonOptions, mergerOptions } from "./options/types"
import { createCache } from "./cache/cache"

const optionsCache = createCache<Partial<JsonOptions>, JsonOptions>()

export function deserialize<T>(json: Uint8Array<ArrayBuffer>, metadata: Metadata, options?: Partial<JsonOptions>): T {
    const opts = !!options ?
        optionsCache.getOrAdd(options, (key) => mergerOptions(defaultOptions, key)) :
        defaultOptions

    const result = convert({
        bytes: json,
        options: opts,
        convert: convert
    }, metadata, 0, 0)

    if (isError(result))
        throw new Error(result.error)

    return result.value as T
}

function convert(ctx: ConvertState, metadata: ConvertMeta, index: number, depth: number): ConvertResult<unknown> {
    if (isMultiMeta(metadata))
        throw new Error('invalid metadata value')

    if (depth > ctx.options.maxDepth)
        throw new Error(`max depth hit ${ctx.options.maxDepth}`)

    const converter = ctx.options.converters[metadata.type]
    if (!converter)
        throw new Error(`converter not found for type ${metadata.type}`)

    return converter(ctx, metadata, index, depth + 1)
}