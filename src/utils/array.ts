export type IndexableArray<V> = {
    length: number
    [index: number]: V
    slice: (start?: number, end?: number) => IndexableArray<V>
}

export type ArrayRecycler<T extends IndexableArray<V>, V> = {
    acquire: (length: number, source?: T) => T,
    dispose(): void
}

export const clampLength = (minLength: number): number =>
    Math.pow(2, Math.ceil(Math.log2(minLength)))

export function useArrayPool<T>(minLength: number = 2) {
    const gloablMinLength = clampLength(minLength)
    const store = new Map<number, Array<T[]>>()

    const acquire = (minLength: number): Array<T> => {
        const length = Math.max(gloablMinLength, clampLength(minLength))

        const linearStore = store.get(length)
        if (linearStore && linearStore.length > 0) 
            return linearStore.pop()!

        return new Array<T>(length)
    }

    const release = (array: Array<T>): void => {
        const length = clampLength(array.length)

        if (length !== array.length) {
            array.length = length
        }

        const linearStore = store.get(length)
        if (linearStore) {
            linearStore.push(array)
            return
        }

        store.set(length, [array])
    }

    return {
        acquire,
        release
    }
}

export function useArrayRecycler<T extends IndexableArray<V>, V>(ctor: new (length: number) => T): ArrayRecycler<T, V> {
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
