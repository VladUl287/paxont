export class Nullable<T> {
    constructor(private readonly _value: T) { }

    public get value() {
        return this._value
    }
}

export class Int8 {
    __brand: 'Int8' = 'Int8'
}
export class Int16 {
    __brand: 'Int16' = 'Int16'
}
export class Int32 {
    __brand: 'Int32' = 'Int32'
}
export class Int64 {
    __brand: 'Int64' = 'Int64'
}
export class Uint8 {
    __brand: 'Uint8' = 'Uint8'
}
export class Uint16 {
    __brand: 'Uint16' = 'Uint16'
}
export class Uint32 {
    __brand: 'Uint32' = 'Uint32'
}
export class Uint64 {
    __brand: 'Uint64' = 'Uint64'
}