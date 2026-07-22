import { Stack } from "./structs"

export interface MutableArray<V> {
    readonly length: number
    [index: number]: V
    slice: (start?: number, end?: number) => this
}

export type ArrayRecycler<A extends MutableArray<any>> = {
    acquire: (length: number, source?: A) => A,
    dispose(): void
}

export type ArrayPool<A extends ArrayLike<any>> = {
    rent: (minLength: number) => A
    release: (array: A) => void
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

export function useArrayPool<A extends ArrayLike<any>>(ctor: new (length: number) => A): ArrayPool<A> {
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

    return { rent, release }
}

export function useArrayRecycler<A extends MutableArray<any>>(ctor: new (length: number) => A): ArrayRecycler<A> {
    let array: A | null = null

    const acquire = (newLength: number, source?: A) => {
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
