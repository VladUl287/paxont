export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
    readonly maxDepth: number
}

export const defaultOptions: JsonOptions = Object.freeze({
    encoder: new TextEncoder(),
    decoder: new TextDecoder('utf-8', {
        fatal: true
    }),
    maxDepth: 64
})

export function createOptions(seed: Partial<JsonOptions>): JsonOptions {
    return {
        ...defaultOptions,
        ...Object.fromEntries(
            Object.entries(seed ?? {}).filter(([_, value]) => value !== null && value !== undefined)
        )
    }
}