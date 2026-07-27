import { genObjectFactory } from "../../src/code_gen/object"

describe('genObjectFactory', () => {
  describe('basic functionality', () => {
    it('should create an object from fields and values arrays of same length', () => {
      const factory = genObjectFactory(['name', 'age', 'city'])
      const result = factory(['John', 30, 'New York'])
      
      expect(result).toEqual({
        name: 'John',
        age: 30,
        city: 'New York'
      })
    })

    it('should handle single field', () => {
      const factory = genObjectFactory(['name'])
      const result = factory(['John'])
      
      expect(result).toEqual({ name: 'John' })
    })

    it('should handle empty fields array', () => {
      const factory = genObjectFactory([])
      const result = factory([])
      
      expect(result).toEqual({})
    })
  })

  describe('value types', () => {
    it('should preserve different value types', () => {
      const factory = genObjectFactory(['string', 'number', 'boolean', 'null', 'undefined', 'object'])
      const result = factory(['text', 42, true, null, undefined, { key: 'value' }])
      
      expect(result).toEqual({
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        object: { key: 'value' }
      })
    })

    it('should handle arrays as values', () => {
      const factory = genObjectFactory(['items', 'nested'])
      const result = factory([
        [1, 2, 3],
        [{ a: 1 }, { b: 2 }]
      ])
      
      expect(result).toEqual({
        items: [1, 2, 3],
        nested: [{ a: 1 }, { b: 2 }]
      })
    })

    it('should handle function values', () => {
      const fn = () => 'test'
      const factory = genObjectFactory(['callback'])
      const result = factory([fn])
      
      expect(result.callback).toBe(fn)
      expect((result.callback as Function)()).toBe('test')
    })
  })

  describe('edge cases', () => {
    it('should handle fields with special characters', () => {
      const factory = genObjectFactory(['field-with-dash', 'field_with_underscore', 'field with space'])
      const result = factory(['value1', 'value2', 'value3'])
      
      expect(result).toEqual({
        'field-with-dash': 'value1',
        'field_with_underscore': 'value2',
        'field with space': 'value3'
      })
    })

    it('should handle numeric field names', () => {
      const factory = genObjectFactory(['1', '2', '3'])
      const result = factory(['one', 'two', 'three'])
      
      expect(result).toEqual({
        '1': 'one',
        '2': 'two',
        '3': 'three'
      })
    })

    it('should handle duplicate field names', () => {
      const factory = genObjectFactory(['name', 'name', 'age'])
      const result = factory(['John', 'Jane', 30])
      
      expect(result).toEqual({
        name: 'Jane',
        age: 30
      })
    })
  })

  describe('array length mismatch', () => {
    it('should handle more values than fields', () => {
      const factory = genObjectFactory(['name', 'age'])
      const result = factory(['John', 30, 'extra', 'values'])
      
      expect(result).toEqual({
        name: 'John',
        age: 30
      })
    })

    it('should handle fewer values than fields', () => {
      const factory = genObjectFactory(['name', 'age', 'city'])
      const result = factory(['John', 30])
      
      expect(result).toEqual({
        name: 'John',
        age: 30,
        city: undefined
      })
    })

    it('should handle empty values array with non-empty fields', () => {
      const factory = genObjectFactory(['name', 'age'])
      const result = factory([])
      
      expect(result).toEqual({
        name: undefined,
        age: undefined
      })
    })
  })

  describe('performance and large data', () => {
    it('should handle large number of fields', () => {
      const fields = Array.from({ length: 1000 }, (_, i) => `field_${i}`)
      const values = Array.from({ length: 1000 }, (_, i) => i)
      
      const factory = genObjectFactory(fields)
      const result = factory(values)
      
      expect(Object.keys(result)).toHaveLength(1000)
      expect(result.field_0).toBe(0)
      expect(result.field_999).toBe(999)
    })

    it('should handle large string values', () => {
      const largeString = 'a'.repeat(10000)
      const factory = genObjectFactory(['large'])
      const result = factory([largeString])
      
      expect(result.large).toBe(largeString)
      expect((result.large as string).length).toBe(10000)
    })
  })

  describe('return type and immutability', () => {
    it('should return a new object each time', () => {
      const factory = genObjectFactory(['name'])
      const result1 = factory(['John'])
      const result2 = factory(['Jane'])
      
      expect(result1).not.toBe(result2)
      expect(result1).toEqual({ name: 'John' })
      expect(result2).toEqual({ name: 'Jane' })
    })

    it('should not mutate the input arrays', () => {
      const fields = ['name', 'age']
      const values = ['John', 30]
      const fieldsCopy = [...fields]
      const valuesCopy = [...values]
      
      const factory = genObjectFactory(fields)
      factory(values)
      
      expect(fields).toEqual(fieldsCopy)
      expect(values).toEqual(valuesCopy)
    })
  })

  describe('error handling', () => {
    it('should handle null values gracefully', () => {
      const factory = genObjectFactory(['name', 'age'])
      const result = factory([null, null])
      
      expect(result).toEqual({
        name: null,
        age: null
      })
    })

    it('should handle undefined field names', () => {
      const factory = genObjectFactory(['name', undefined as any, 'age'])
      const result = factory(['John', 'middle', 30])
      
      expect(result).toEqual({
        name: 'John',
        undefined: 'middle',
        age: 30
      })
    })

    it('should handle non-array inputs gracefully', () => {
      const factory = genObjectFactory(['name'])
      
      expect(() => factory(null as any)).toThrow()
      expect(() => factory(undefined as any)).toThrow()
    })
  })

  describe('use cases', () => {
    it('should work with dynamic field generation', () => {
      const prefix = 'user'
      const fields = ['id', 'name', 'email'].map(f => `${prefix}_${f}`)
      const factory = genObjectFactory(fields)
      const result = factory([1, 'John', 'john@example.com'])
      
      expect(result).toEqual({
        user_id: 1,
        user_name: 'John',
        user_email: 'john@example.com'
      })
    })

    it('should work with CSV-like data', () => {
      const headers = ['first_name', 'last_name', 'email']
      const row = ['John', 'Doe', 'john.doe@example.com']
      
      const factory = genObjectFactory(headers)
      const result = factory(row)
      
      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      })
    })

    it('should work with API response transformation', () => {
      const fields = ['userId', 'userName', 'userEmail']
      const apiData = ['123', 'John Smith', 'john@example.com']
      
      const factory = genObjectFactory(fields)
      const result = factory(apiData)
      
      expect(result).toEqual({
        userId: '123',
        userName: 'John Smith',
        userEmail: 'john@example.com'
      })
    })
  })

  describe('type safety', () => {
    it('should maintain type information', () => {
      const factory = genObjectFactory(['name', 'age'])
      const result = factory(['John', 30])
      
      expect(typeof result.name).toBe('string')
      expect(typeof result.age).toBe('number')
    })
  })
})