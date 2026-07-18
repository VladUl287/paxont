export type IndexableArray<V> = {
    length: number
    [index: number]: V
    slice: (start?: number, end?: number) => IndexableArray<V>
}

export type ArrayRecycler<T extends IndexableArray<V>, V> = {
    acquire: (length: number, source?: T) => T,
    dispose(): void
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
