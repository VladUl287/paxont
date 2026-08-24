import { Stack } from "./stack"

export interface ArrayLikeWritable<T> {
    readonly length: number
    [index: number]: T
    slice: (start?: number, end?: number) => this
}

export type ArrayPool<A extends ArrayLike<any>> = {
    rent: (minLength: number) => A
    release: (array: A) => void
    clear: (array: A, start: number, end: number) => void
}

export type IntegerTypedArray =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array

export type FloatTypedArray =
    | Float32Array
    | Float64Array

export type BigIntTypedArray =
    | BigInt64Array
    | BigUint64Array

export const clampLength = (minLength: number): number => {
    const n = (minLength >>> 0) - 1
    if (n <= 0) return 1
    return 1 << (32 - Math.clz32(n))
}

type ArrayPoolOptions<A extends ArrayLikeWritable<any>> = {
    ctor: new (length: number) => A,
    clear?: (array: A, start: number, end: number) => void
}

export function arrayPool<A extends ArrayLikeWritable<any>>({ ctor, clear }: ArrayPoolOptions<A>): ArrayPool<A> {
    const MAX_LENGTH = 0x3fffffff
    const globalMinLength = 2
    const pool = new Map<number, Stack<A>>()

    let hotArray: A | undefined

    const rent = (minLength: number): A => {
        let len = minLength >>> 0
        if (len < globalMinLength) len = globalMinLength
        else if (len > MAX_LENGTH) len = MAX_LENGTH
        else len = clampLength(len)

        if (hotArray && hotArray.length >= len) {
            const arr = hotArray
            hotArray = undefined
            return arr
        }

        const stack = pool.get(len)
        if (stack !== undefined)
            return stack.pop() ?? new ctor(len)

        return new ctor(len)
    }

    const release = (array: A): void => {
        let len = array.length >>> 0

        if (len > MAX_LENGTH) return
        if (len & (len - 1)) return

        if (hotArray === undefined) {
            hotArray = array
            return
        }

        let stack = pool.get(len)
        if (stack === undefined) {
            stack = new Stack<A>()
            pool.set(len, stack)
        }
        stack.push(array)
    }

    const fallbackClear = (array: A, start: number, end: number): void => { }

    return { rent, release, clear: clear ?? fallbackClear }
}
