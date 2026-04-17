import { convertNumber } from "./converters/number"
import { convertObject } from "./converters/object"
import { convertString } from "./converters/string"
import { ConvertMeta, ConvertResult, ConvertState, isMultiMeta, isSuccess } from "./converters/types"
import { Metadata } from "./metadata/metadata"
import { JsonOptions } from "./options/types"
import { mergerOptions } from "./options"
import { createCache } from "./cache/cache"

const defaultOptions: JsonOptions = Object.freeze({
    encoder: new TextEncoder(),
    decoder: new TextDecoder('utf-8', {
        fatal: true
    }),
    converters: {
        number: convertNumber,
        string: convertString,
        object: convertObject
    },
    maxDepth: 64,
    allowTrailingCommas: false,
    fieldCaseInsensitive: false,
    allowDuplicateProperties: false
})

const optionsCache = createCache<any, JsonOptions>()

export function deserialize<T>(json: Uint8Array<ArrayBuffer>, metadata: Metadata, options?: Partial<JsonOptions>): T {
    const opts = optionsCache.getOrAdd(options, (key) => mergerOptions(defaultOptions, key))

    const result = convert({
        bytes: json,
        options: opts,
        convert: convert
    }, metadata, 0, 0)

    if (isSuccess(result))
        return result.value as T

    return undefined as T
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