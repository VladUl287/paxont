import { BaseMeta } from "../metadata/types"

export type ErrorContext = {
    index?: number;
    depth?: number;
    metadata?: BaseMeta<any, any>
    cause?: unknown
    [key: string]: unknown
}

export class JSONParseError extends Error {
    public readonly index?: number
    public readonly depth?: number
    public readonly metadata?: BaseMeta<unknown, any>
    public readonly cause?: unknown

    constructor(message: string, context?: ErrorContext) {
        super(message)

        this.name = 'JSONParseError'

        const { index: position, depth, metadata, cause, ...extra } = context ?? {}

        this.index = position
        this.depth = depth
        this.metadata = metadata
        this.cause = cause

        Object.assign(this, extra)

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JSONParseError)
        }
    }

    toString(): string {
        const parts = [this.message]

        if (this.metadata !== undefined) {
            parts.push(`while parsing '${this.metadata.type}'`)
        }

        if (this.index !== undefined) {
            parts.push(`at position ${this.index}`)
        }

        if (this.depth !== undefined) {
            parts.push(`at depth ${this.depth}`)
        }

        return parts.join(', ')
    }
}