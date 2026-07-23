export type ErrorContext = {
    position?: number,
    depth?: number,
    metadata?: unknown,
    cause?: unknown,
    [key: string]: unknown
}

export class JSONParseError extends Error {
    public readonly position?: number
    public readonly depth?: number
    public readonly metadata?: unknown
    public readonly cause?: unknown

    constructor(
        message: string,
        options?: ErrorContext
    ) {
        super(message)

        this.name = 'JSONParseError'

        this.position = options?.position
        this.depth = options?.depth
        this.metadata = options?.metadata
        this.cause = options?.cause

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JSONParseError)
        }
    }
}