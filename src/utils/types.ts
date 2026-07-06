export type ReadResult<T> = {
    readonly value?: T
    readonly nextIndex: number
}

export class Nullable<T> {
    constructor(private readonly _value: T) { }

    public get value() {
        return this._value
    }

    static new<T>(value: T) {
        return new Nullable<T>(value)
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
