import { TypeName } from "../metadata/metadata"
import { Converter } from "../converters/types"
import { convertNumber } from "../converters/number"
import { convertString } from "../converters/string"
import { convertObject } from "../converters/object"

export type TypeMapping = {
    string: string
    number: number
    bigint: bigint
    boolean: boolean
    symbol: symbol
    object: object
    array: any[]
    date: Date
    map: Map<any, any>
    set: Set<any>
    undefined: undefined
    function: Function
}

export type Converters = {
    [key in TypeName]?: Converter<unknown>
}

export type ConverterResolver = <T extends TypeName>(type: T) => Converter<TypeMapping[T]>

export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
    readonly converters: Converters
    readonly getConverter: ConverterResolver
    readonly maxDepth: number
    readonly allowTrailingCommas: boolean,
    readonly fieldCaseInsensitive: boolean
    readonly allowDuplicateProperties: boolean
}

const createConverterResolver = (converters: Converters): ConverterResolver => {
    let body = 'switch(type){'
    Object.keys(converters).map(key => {
        body += `case '${key}': return converters['${key}']\n`
    })
    body += '}'
    return new Function("converters", "type", body)
        .bind(null, converters) as ConverterResolver
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
    getConverter: createConverterResolver({
        number: convertNumber,
        string: convertString,
        object: convertObject
    }),
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
        },
        getConverter: createConverterResolver({
            ...base.converters,
            ...(add?.converters ?? {})
        })
    }
}