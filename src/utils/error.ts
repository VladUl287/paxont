export class JSONParseError extends Error {
    public readonly position?: number
    public readonly depth?: number
    public readonly metadata?: unknown
    public readonly cause?: unknown

    constructor(
        message: string,
        position?: number,
        options?: {
            depth?: number,
            metadata?: unknown,
            cause?: unknown
        }
    ) {
        super(message)

        this.name = 'JSONParseError'

        this.position = position
        this.metadata = options?.metadata
        this.cause = options?.cause

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JSONParseError)
        }
    }
}