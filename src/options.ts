export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
    readonly maxDepth: number
}

export const defaultOptions: JsonOptions = Object.freeze({
    encoder: new TextEncoder(),
    decoder: new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: true
    }),
    maxDepth: 64
})
