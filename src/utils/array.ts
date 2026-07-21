import { Stack } from "./structs"

export interface MutableArray<V> {
    readonly length: number
    [index: number]: V
    slice: (start?: number, end?: number) => this
}

export type ArrayRecycler<T extends MutableArray<V>, V> = {
    acquire: (length: number, source?: T) => T,
    dispose(): void
}

export const copyArray = <V, T extends MutableArray<V>>(source: ArrayLike<V>, target: T): T => {
    if (!source || !target) return target

    const length = Math.min(source.length, target.length)
    for (let i = 0; i < length; i++)
        target[i] = source[i]

    return target
}

export const clampLength = (minLength: number): number => {
    const n = (minLength >>> 0) - 1
    if (n <= 0) return 1
    return 1 << (32 - Math.clz32(n))
}

const globalPools = Object.freeze({
    string: useArrayPool<string>(128),
    number: useArrayPool<number>(128),
    object: useArrayPool<object>(128)
})

export type ArrayPool<V, T extends ArrayLike<V>> = {
    rent: (minLength: number) => T
    release: (array: T) => void
}

export function useArrayPool<T>(minLength = 2): ArrayPool<T, Array<T>> {
    const MAX_LENGTH = 0x3fffffff
    const globalMinLength = clampLength(Math.max(2, minLength >>> 0))
    const pool = new Map<number, Stack<Array<T>>>()

    let hotArray: Array<T> | undefined

    const rent = (minLength: number): Array<T> => {
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
            return stack.pop() ?? new Array<T>(len)

        return new Array<T>(len)
    }

    const release = (array: Array<T>): void => {
        let len = array.length >>> 0
        if (len > MAX_LENGTH) {
            array.length = MAX_LENGTH
            len = MAX_LENGTH
        }
        if (len & (len - 1)) return

        if (hotArray === undefined) {
            hotArray = array
            return
        }

        let stack = pool.get(len)
        if (stack === undefined) {
            stack = new Stack<Array<T>>()
            pool.set(len, stack)
        }
        stack.push(array)
    }

    return { rent, release }
}

export function useArrayRecycler<T extends MutableArray<V>, V>(ctor: new (length: number) => T): ArrayRecycler<T, V> {
    let array: T | null = null

    const acquire = (newLength: number, source?: T) => {
        if (array !== null && array.length >= newLength) {
            if (source) {
                const length = Math.min(newLength, source.length)
                for (let i = 0; i < length; i++)
                    array[i] = source[i]
            }
            return array
        }

        array = new ctor(newLength)

        if (source) {
            const length = Math.min(newLength, source.length)
            for (let i = 0; i < length; i++)
                array[i] = source[i]
        }

        return array
    }

    const dispose = () => (array = null)

    return {
        acquire,
        dispose
    }
}
