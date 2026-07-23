export type Cache<K, V> = {
    getOrAdd: <T extends V>(key: K, factory: (key: K) => T) => T
}

export type CacheFactory = <K, V>() => Cache<K, V>

export function createCache<K, V>(): Cache<K, V> {
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