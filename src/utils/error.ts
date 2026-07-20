export class JSONParseError extends Error {
    public readonly position?: number
    public readonly cause?: unknown

    constructor(
        message: string,
        position: number,
        options?: {
            cause?: unknown
        }
    ) {
        super(message)

        this.name = 'JSONParseError'

        this.position = position
        this.cause = options?.cause

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JSONParseError)
        }
    }
}