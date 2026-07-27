import { genObjectToJsonFactory } from "../../src/code_gen/object"
import { field, number, object, string } from "../../src/metadata/builder"
import { defaultOptions } from "../../src/options"

describe('genObjectToJsonFactory', () => {
    describe('basic functionality', () => {
        it('should generate a function that converts object to JSON string', () => {
            const toJson = genObjectToJsonFactory(['name', 'age'])
            const metadata = object(field("name", string()), field("age", number()))
            const value = { name: 'John', age: 30 }

            const result = toJson(metadata, value, defaultOptions)

            expect(result).toBe(JSON.stringify({ name: 'John', age: 30 }))
        })

        it('should handle empty fields array', () => {
            const toJson = genObjectToJsonFactory([])
            const metadata = object()
            const result = toJson(metadata, {}, defaultOptions)

            expect(result).toBe(JSON.stringify({}))
        })

        it('should handle single field', () => {
            const toJson = genObjectToJsonFactory(['name'])
            const metadata = object(field("name", string()))
            const result = toJson(metadata, { name: 'John' }, defaultOptions)

            expect(result).toBe(JSON.stringify({ name: 'John' }))
        })
    })

    describe('field selection', () => {
        it('should only include specified fields', () => {
            const toJson = genObjectToJsonFactory(['name', 'email'])
            const value = {
                name: 'John',
                age: 30,
                email: 'john@example.com',
                password: 'secret'
            }

            const metadata = object(
                field("name", string()),
                field("age", number()),
                field("email", string()),
                field("password", string()),
            )

            const result = toJson(metadata, value, defaultOptions)
            const parsed = JSON.parse(result)

            expect(parsed).toEqual({
                name: 'John',
                email: 'john@example.com'
            })
            expect(parsed.age).toBeUndefined()
            expect(parsed.password).toBeUndefined()
        })
    })

    describe('options handling', () => {

    })

    describe('error handling', () => {
        it('should handle missing fields gracefully', () => {
            const toJson = genObjectToJsonFactory(['name', 'age'])

            const value = { name: 'John' }

            const metadata = object(
                field("name", string()),
                field("age", number()),
            )

            const result = toJson(metadata, value, defaultOptions)
            const parsed = JSON.parse(result)

            expect(parsed).toEqual({ name: 'John' })
        })

        it('should handle circular references', () => {
            const toJson = genObjectToJsonFactory(['name', 'self'])
            const obj: any = { name: 'John' }
            obj.self = obj

            const metadata = object(field("name", string()))

            const result = toJson(metadata, obj, defaultOptions)
            const parsed = JSON.parse(result)

            expect(parsed.name).toBe('John')
        })

        it('should handle null/undefined value object', () => {
            const toJson = genObjectToJsonFactory(['name'])

            const metadata = object(field("name", string()))

            expect(() => toJson(metadata, null as any, defaultOptions)).toThrow()
            expect(() => toJson(metadata, undefined as any, defaultOptions)).toThrow()
        })
    })

    describe('type safety and immutability', () => {
        it('should not mutate input objects', () => {
            const toJson = genObjectToJsonFactory(['name'])
            const value = { name: 'John', age: 30 }
            const valueCopy = { ...value }

            const metadata = object(field("name", string()))

            toJson(metadata, value, defaultOptions)

            expect(value).toEqual(valueCopy)
        })

        it('should return a string', () => {
            const toJson = genObjectToJsonFactory(['name'])

            const metadata = object(field("name", string()))

            const result = toJson(metadata, { name: 'John' }, defaultOptions)

            expect(typeof result).toBe('string')
        })

        it('should produce valid JSON strings', () => {
            const toJson = genObjectToJsonFactory(['name', 'age', 'data'])
            
            const value = {
                name: 'John',
                age: 30,
                data: {}
            }

            const metadata = object(
                field("name", string()),
                field("age", number()),
                field("data", object())
            )

            const result = toJson(metadata, value, defaultOptions)

            expect(() => JSON.parse(result)).not.toThrow()
        })
    })
})