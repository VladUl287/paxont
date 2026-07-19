export class JSONParseError extends Error {
    constructor(message: string) {
        super(message)

        this.name = 'JSONParseError'

        // this.position = position
        // this.expected = expected
        // this.actual = actual

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, JSONParseError)
        }
    }
}