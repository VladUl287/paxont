export type ReadResult<T> = {
    readonly value: T
    readonly nextIndex: number
}

export abstract class BaseWrapper<T> {
    constructor(private readonly _value: T) { }

    public get value() {
        return this._value
    }
}

export class Nullable<T> extends BaseWrapper<T> {
    static new<T>(value: T) {
        return new Nullable<T>(value)
    }
}

export class Int8 extends BaseWrapper<number> { }
export class Int16 extends BaseWrapper<number> { }
export class Int32 extends BaseWrapper<number> { }
export class Int64 extends BaseWrapper<number> { }
export class Uint8 extends BaseWrapper<number> { }
export class Uint16 extends BaseWrapper<number> { }
export class Uint32 extends BaseWrapper<number> { }
export class Uint64 extends BaseWrapper<number> { }
export class Float32 extends BaseWrapper<number> { }
