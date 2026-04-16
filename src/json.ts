import { convertNumber } from "./converters/number"
import { convertObject } from "./converters/object"
import { convertString } from "./converters/string"
import { ConvertMeta, ConvertResult, ConvertState } from "./converters/types"
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

    return result.value as T
}

function convert<T>(ctx: ConvertState, meta: ConvertMeta, index: number, depth: number): ConvertResult<T> {
    const options = ctx.options

    if (depth > options.maxDepth)
        throw new Error(`Max depth hit ${options.maxDepth}`)

    const converter = options.converters[(meta as Metadata).type]
    if (!converter)
        throw new Error(`Converter not found for type ${(meta as Metadata).type}`)

    return converter(ctx, meta, index, depth + 1) as ConvertResult<T>
}