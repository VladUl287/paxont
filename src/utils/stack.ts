export interface IStack<T> {
    get isEmpty(): boolean
    push(value: T): void
    pop(): T | undefined
    peek(): T | undefined
}

export class Stack<T> implements IStack<T> {
    private readonly stack: Array<T>
    private length: number = 0

    constructor(length: number = 2) {
        this.stack = new Array<T>(length)
    }

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

    peek(): T | undefined {
        return this.stack[this.length - 1]
    }

    get isEmpty(): boolean {
        return this.length === 0
    }
}
