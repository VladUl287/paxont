import { memoize, Memoize } from "../../src/utils/memo"

describe('memo', () => {
    let memo: Memoize<string, number>

    beforeEach(() => {
        memo = memoize<string, number>()
    })

    describe('getOrAdd', () => {
        it('should return existing value if key exists in cache', () => {
            const key = 'test'
            const existingValue = 42
            const factory = jest.fn().mockReturnValue(100)

            memo.getOrAdd(key, () => existingValue)

            const result = memo.getOrAdd(key, factory)

            expect(result).toBe(existingValue)
            expect(factory).not.toHaveBeenCalled()
        })

        it('should add new value if key does not exist in cache', () => {
            const key = 'newKey'
            const expectedValue = 123
            const factory = jest.fn().mockReturnValue(expectedValue)

            const result = memo.getOrAdd(key, factory)

            expect(result).toBe(expectedValue)
            expect(factory).toHaveBeenCalledWith(key)
            expect(factory).toHaveBeenCalledTimes(1)
        })

        it('should store and retrieve value of subtype T when V is supertype', () => {
            interface Animal {
                name: string
            }
            interface Dog extends Animal {
                breed: string
            }

            const cache = memoize<string, Animal>()
            const key = 'fido'
            const dog: Dog = { name: 'Fido', breed: 'Labrador' }


            const result = cache.getOrAdd<Dog>(key, () => dog)


            expect(result).toBe(dog)
            expect(result.breed).toBe('Labrador')
        })

        it('should call factory with the provided key', () => {

            const key = 'testKey'
            const factory = jest.fn().mockReturnValue(42)


            memo.getOrAdd(key, factory)


            expect(factory).toHaveBeenCalledWith(key)
        })

        it('should handle different key types', () => {

            const numberCache = memoize<number, string>()
            const key = 123
            const value = 'test value'
            const factory = jest.fn().mockReturnValue(value)


            const result = numberCache.getOrAdd(key, factory)


            expect(result).toBe(value)
            expect(factory).toHaveBeenCalledWith(key)
        })

        it('should handle complex value types', () => {

            type User = { id: number; name: string }
            const userCache = memoize<string, User>()
            const key = 'user1'
            const user: User = { id: 1, name: 'John Doe' }


            const result = userCache.getOrAdd(key, () => user)


            expect(result).toEqual(user)
            expect(result).toBe(user)
        })

        it('should cache null/undefined values correctly', () => {

            const key = 'nullKey'
            const nullValue = null
            const factory = jest.fn().mockReturnValue(nullValue)


            const result1 = memo.getOrAdd(key, factory)
            const result2 = memo.getOrAdd(key, () => 999)


            expect(result1).toBeNull()
            expect(result2).toBeNull()
            expect(factory).toHaveBeenCalledTimes(1)
        })

        it('should not call factory multiple times for same key', () => {

            const key = 'duplicateKey'
            const factory = jest.fn().mockReturnValue(42)


            memo.getOrAdd(key, factory)
            memo.getOrAdd(key, factory)
            memo.getOrAdd(key, factory)


            expect(factory).toHaveBeenCalledTimes(1)
        })

        it('should maintain separate entries for different keys', () => {

            const factory = (key: string) => key.length


            const result1 = memo.getOrAdd('one', factory)
            const result2 = memo.getOrAdd('two', factory)
            const result3 = memo.getOrAdd('three', factory)


            expect(result1).toBe(3)
            expect(result2).toBe(3)
            expect(result3).toBe(5)
        })

        it('should handle factory throwing an error', () => {

            const key = 'errorKey'
            const factory = jest.fn().mockImplementation(() => {
                throw new Error('Factory error')
            })


            expect(() => memo.getOrAdd(key, factory)).toThrow('Factory error')
            expect(factory).toHaveBeenCalledWith(key)


            const safeFactory = jest.fn().mockReturnValue(42)
            const result = memo.getOrAdd(key, safeFactory)
            expect(result).toBe(42)
            expect(safeFactory).toHaveBeenCalled()
        })

        it('should work with async factory functions', async () => {

            const asyncFactory = jest.fn().mockResolvedValue(42)


            const result = memo.getOrAdd('asyncKey', asyncFactory)


            await expect(result).resolves.toBe(42)
            expect(asyncFactory).toHaveBeenCalledWith('asyncKey')
        })
    })

    describe('cache isolation', () => {
        it('should create independent cache instances', () => {

            const cache1 = memoize<string, number>()
            const cache2 = memoize<string, number>()


            cache1.getOrAdd('key1', () => 100)
            cache2.getOrAdd('key2', () => 200)

            const result1 = cache1.getOrAdd('key1', () => 999)
            const result2 = cache1.getOrAdd('key2', () => 999)


            expect(result1).toBe(100)
            expect(result2).toBe(999)
        })
    })

    describe('type safety', () => {
        it('should maintain type safety with different generic types', () => {

            const stringCache = memoize<number, string>()
            const result: string = stringCache.getOrAdd(1, () => 'test')
            expect(result).toBe('test')

            const objCache = memoize<string, { id: number }>()
            const objResult: { id: number } = objCache.getOrAdd('test', () => ({ id: 123 }))
            expect(objResult).toEqual({ id: 123 })
        })

        it('should enforce subtype constraints', () => {
            interface Base { id: number }
            interface Extended extends Base { extra: string }

            const cache = memoize<string, Base>()
            const extendedValue: Extended = { id: 1, extra: 'extra' }


            const result = cache.getOrAdd<Extended>('key', () => extendedValue)
            expect(result.extra).toBe('extra')
        })
    })

    describe('performance and caching behavior', () => {
        it('should use Map internally', () => {

            const key = 'mapTest'
            const value = 42


            memo.getOrAdd(key, () => value)


            const result1 = memo.getOrAdd(key, () => 999)
            const result2 = memo.getOrAdd(key, () => 999)


            expect(result1).toBe(value)
            expect(result2).toBe(value)
        })

        it('should handle large number of entries', () => {

            const numEntries = 1000


            for (let i = 0; i < numEntries; i++) {
                memo.getOrAdd(`key${i}`, (k) => k.length)
            }


            const result1 = memo.getOrAdd('key0', () => 999)
            const result500 = memo.getOrAdd('key500', () => 999)
            const result999 = memo.getOrAdd('key999', () => 999)

            expect(result1).toBe(4)
            expect(result500).toBe(6)
            expect(result999).toBe(6)
        })
    })
})