import { TypeName } from "../metadata/metadata"
import { Converter } from "../converters/types"
import { convertNumber } from "../converters/number"
import { convertString } from "../converters/string"
import { convertObject } from "../converters/object"

export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
    readonly converters: {
        [key in TypeName]?: Converter<unknown>
    }
    readonly maxDepth: number
    readonly allowTrailingCommas: boolean,
    readonly fieldCaseInsensitive: boolean
    readonly allowDuplicateProperties: boolean
}

export const defaultOptions: JsonOptions = {
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
}

export function mergerOptions(base: JsonOptions, add: Partial<JsonOptions>): JsonOptions {
    return {
        ...base,
        ...Object.fromEntries(
            Object.entries(add ?? {}).filter(([_, value]) => Boolean(value))
        ),
        converters: {
            ...base.converters,
            ...(add?.converters ?? {})
        }
    }
}