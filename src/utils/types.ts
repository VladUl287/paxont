export const enum ReadResultType {
    COMPLETE = 1,
    NEEDS_MORE_DATA = 2,
    ERROR = 3
}

export type ReadResult<T> =
    | { type: ReadResultType.COMPLETE, value: T, nextIndex: number }
    | { type: ReadResultType.NEEDS_MORE_DATA, nextIndex: number }
    | { type: ReadResultType.ERROR, error: Error }

export function isComplete<T>(
    result: ReadResult<T>
): result is Extract<ReadResult<T>, { type: ReadResultType.COMPLETE }> {
    return result.type === ReadResultType.COMPLETE
}

export function isNeedsMoreData<T>(
    result: ReadResult<T>
): result is Extract<ReadResult<T>, { type: ReadResultType.NEEDS_MORE_DATA }> {
    return result.type === ReadResultType.NEEDS_MORE_DATA
}

export function isError<T>(
    result: ReadResult<T>
): result is Extract<ReadResult<T>, { type: ReadResultType.ERROR }> {
    return result.type === ReadResultType.ERROR
}

export class Nullable<T> {
    constructor(private readonly _value: T) { }

    public get value() {
        return this._value
    }
}

export class Int8 { }
export class Int16 { }
export class Int32 { }
export class Int64 { }
export class Uint8 { }
export class Uint16 { }
export class Uint32 { }
export class Uint64 { }
export class Float32 { }
