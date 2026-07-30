export type Memo<K, V> = {
    getOrAdd: <T extends V>(key: K, factory: (key: K) => T) => T
}

export type MemoFactory = <K, V>() => Memo<K, V>

export function memo<K, V>(): Memo<K, V> {
    const cache = new Map<K, V>()

    return {
        getOrAdd: <T extends V>(key: K, factory: (key: K) => T): T => {
            if (cache.has(key))
                return cache.get(key) as T

            const value = factory(key)
            cache.set(key, value)
            return value
        }
    }
}