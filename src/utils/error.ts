import { BaseMeta } from "../metadata/types"

export type ErrorContext = {
    position?: number;
    depth?: number;
    metadata?: BaseMeta<unknown, any>
    cause?: unknown
    [key: string]: unknown
}

export class JSONParseError extends Error {
    public readonly position?: number
    public readonly depth?: number
    public readonly metadata?: BaseMeta<unknown, any>
    public readonly context: Readonly<ErrorContext>
    public readonly cause?: unknown

    constructor(message: string, context?: ErrorContext) {
        super(message)

        this.name = 'JSONParseError'

        const { position, depth, metadata, cause, ...extra } = context ?? {}

        this.position = position
        this.depth = depth
        this.metadata = metadata
        this.cause = cause

        this.context = Object.freeze({ ...context })

        Object.assign(this, extra)

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JSONParseError)
        }
    }

    toString(): string {
        const parts = [this.message]

        if (this.position !== undefined) {
            parts.push(`at position ${this.position}`)
        }

        if (this.depth !== undefined) {
            parts.push(`at depth ${this.depth}`)
        }

        return parts.join(', ')
    }
}