export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
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
    maxDepth: 64,
    allowTrailingCommas: false,
    fieldCaseInsensitive: false,
    allowDuplicateProperties: false
}

export function mergeOptions(base: JsonOptions, add: Partial<JsonOptions>): JsonOptions {
    return {
        ...base,
        ...Object.fromEntries(
            Object.entries(add ?? {}).filter(([_, value]) => Boolean(value))
        )
    }
}