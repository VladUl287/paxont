import { isMetadata } from "../../src/metadata/utils"

describe('isMetadata', () => {
    describe('should return true for valid metadata objects', () => {
        test('with all required properties', () => {
            const validMetadata = {
                toValue: () => 'some value',
                toJson: () => ({ key: 'value' }),
                type: 'string'
            }

            expect(isMetadata(validMetadata)).toBe(true)
        })

        test('with different toValue return types', () => {
            const metadataWithNumber = {
                toValue: () => 42,
                toJson: () => ({ value: 42 }),
                type: 'number'
            }
            expect(isMetadata(metadataWithNumber)).toBe(true)

            const metadataWithObject = {
                toValue: () => ({ nested: 'value' }),
                toJson: () => ({ nested: 'value' }),
                type: 'object'
            }
            expect(isMetadata(metadataWithObject)).toBe(true)
        })

        test('with different type strings', () => {
            const types = ['string', 'number', 'boolean', 'object', 'array', 'custom']
            types.forEach(type => {
                const metadata = {
                    toValue: () => null,
                    toJson: () => ({}),
                    type
                }
                expect(isMetadata(metadata)).toBe(true)
            })
        })
    })

    describe('should return false for invalid values', () => {
        test('null and undefined', () => {
            expect(isMetadata(null)).toBe(false)
            expect(isMetadata(undefined)).toBe(false)
        })

        test('non-object values', () => {
            expect(isMetadata('string')).toBe(false)
            expect(isMetadata(123)).toBe(false)
            expect(isMetadata(true)).toBe(false)
            expect(isMetadata(Symbol('test'))).toBe(false)
            expect(isMetadata(() => { })).toBe(false)
        })

        test('objects missing toValue function', () => {
            const missingToValue = {
                toJson: () => ({}),
                type: 'string'
            }
            expect(isMetadata(missingToValue)).toBe(false)
        })

        test('objects missing toJson function', () => {
            const missingToJson = {
                toValue: () => 'value',
                type: 'string'
            }
            expect(isMetadata(missingToJson)).toBe(false)
        })

        test('objects missing type property', () => {
            const missingType = {
                toValue: () => 'value',
                toJson: () => ({})
            }
            expect(isMetadata(missingType)).toBe(false)
        })

        test('objects where toValue is not a function', () => {
            const invalidToValue = {
                toValue: 'not a function',
                toJson: () => ({}),
                type: 'string'
            }
            expect(isMetadata(invalidToValue)).toBe(false)
        })

        test('objects where toJson is not a function', () => {
            const invalidToJson = {
                toValue: () => 'value',
                toJson: 'not a function',
                type: 'string'
            }
            expect(isMetadata(invalidToJson)).toBe(false)
        })

        test('objects where type is not a string', () => {
            const invalidType = {
                toValue: () => 'value',
                toJson: () => ({}),
                type: 123
            }
            expect(isMetadata(invalidType)).toBe(false)
        })
    })

    describe('edge cases', () => {
        test('empty object', () => {
            expect(isMetadata({})).toBe(false)
        })

        test('object with extra properties', () => {
            const metadataWithExtra = {
                toValue: () => 'value',
                toJson: () => ({}),
                type: 'string',
                extraProperty: 'should not matter'
            }
            expect(isMetadata(metadataWithExtra)).toBe(true)
        })

        test('object with methods that throw', () => {
            const throwingMetadata = {
                toValue: () => { throw new Error('toValue error') },
                toJson: () => { throw new Error('toJson error') },
                type: 'string'
            }
            expect(isMetadata(throwingMetadata)).toBe(true)
        })

        test('array objects', () => {
            expect(isMetadata([])).toBe(false)

            const arrayWithProps = {
                toValue: () => 'value',
                toJson: () => ({}),
                type: 'array'
            }
            expect(isMetadata(arrayWithProps)).toBe(true)
        })

        test('objects with property descriptors', () => {
            const metadata = Object.create(null, {
                toValue: { value: () => 'value', enumerable: true },
                toJson: { value: () => ({}), enumerable: true },
                type: { value: 'string', enumerable: true }
            })
            expect(isMetadata(metadata)).toBe(true)
        })
    })
})