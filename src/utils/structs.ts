export class Stack<T> {
    private readonly stack: Array<T> = []
    private length: number = 0

    constructor() { }

    private ensureLength(length: number): void {
        const currentCapacity = this.stack.length
        if (length > currentCapacity) {
            this.stack.length = currentCapacity * 2
        }
    }

    push(value: T): void {
        const idx = this.length
        if (idx >= this.stack.length) {
            this.ensureLength(idx + 1)
        }
        this.stack[idx] = value
        this.length = idx + 1
    }

    pop(): T | undefined {
        const idx = this.length - 1
        if (idx >= 0) {
            const result = this.stack[idx]
            this.stack[idx] = undefined as any
            this.length = idx
            return result
        }
        return undefined
    }

    get isEmpty(): boolean {
        return this.length === 0
    }
}

export class ReadonlyUint8Array extends Uint8Array {
    constructor(data: Uint8Array) {
        super(data)
        return Object.freeze(this)
    }

    readonly [index: number]: number

    set(): void {
        throw new Error('ReadonlyUint8Array is immutable')
    }

    fill(): this {
        throw new Error('ReadonlyUint8Array is immutable')
    }

    copyWithin(): this {
        throw new Error('ReadonlyUint8Array is immutable')
    }

    slice(start?: number, end?: number): ReadonlyUint8Array {
        return new ReadonlyUint8Array(super.slice(start, end))
    }

    subarray(start?: number, end?: number): ReadonlyUint8Array {
        return new ReadonlyUint8Array(super.subarray(start, end));
    }
}
