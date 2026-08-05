export type Memoize<K, V> = {
    getOrAdd: <T extends V>(key: K, factory: (key: K) => T) => T
}

export type MemoizeFactory = <K, V>() => Memoize<K, V>

export function memoize<K, V>(): Memoize<K, V> {
    const store = new Map<K, V>()

    return {
        getOrAdd: <T extends V>(key: K, factory: (key: K) => T): T => {
            if (store.has(key))
                return store.get(key) as T

            const value = factory(key)
            store.set(key, value)
            return value
        }
    }
}