export const enum ReadResultType {
    COMPLETE = 1,
    NEEDS_MORE_DATA = 2,
    ERROR = 3
}

export type ReadResult<T> =
    | { type: ReadResultType.COMPLETE, value: T, nextIndex: number }
    | { type: ReadResultType.NEEDS_MORE_DATA, nextIndex: number }
    | { type: ReadResultType.ERROR, error: Error }

const COMPLETE = ReadResultType.COMPLETE
export function isComplete<T>(
    result: ReadResult<T>
): result is Extract<ReadResult<T>, { type: ReadResultType.COMPLETE }> {
    return result.type === COMPLETE
}

const NEEDS_MORE_DATA = ReadResultType.NEEDS_MORE_DATA
export function isNeedsMoreData<T>(
    result: ReadResult<T>
): result is Extract<ReadResult<T>, { type: ReadResultType.NEEDS_MORE_DATA }> {
    return result.type === NEEDS_MORE_DATA
}

const ERROR = ReadResultType.ERROR
export function isError<T>(
    result: ReadResult<T>
): result is Extract<ReadResult<T>, { type: ReadResultType.ERROR }> {
    return result.type === ERROR
}

export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export function nameof<T>(key: keyof T): keyof T {
    return key
}