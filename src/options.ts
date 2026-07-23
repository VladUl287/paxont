export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
    readonly maxDepth: number
    readonly allowTrailingCommas: boolean,
    readonly fieldCaseInsensitive: boolean
}

export const defaultOptions: JsonOptions = Object.freeze({
    encoder: new TextEncoder(),
    decoder: new TextDecoder('utf-8', {
        fatal: false
    }),
    maxDepth: 64,
    allowTrailingCommas: false,
    fieldCaseInsensitive: false
})

export function mergeOptions(base: JsonOptions, add: Partial<JsonOptions>): JsonOptions {
    return {
        ...base,
        ...Object.fromEntries(
            Object.entries(add ?? {}).filter(([_, value]) => value !== null && value !== undefined)
        )
    }
}