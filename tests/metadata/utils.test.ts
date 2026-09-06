import { isMeta } from "../../src/metadata/utils"

describe('isMeta', () => {
    describe('should return true for valid metadata objects', () => {
        test('with all required properties', () => {
            const validMetadata = {
                toValue: () => 'some value',
                toJson: () => ({ key: 'value' }),
                type: 'string'
            }

            expect(isMeta(validMetadata)).toBe(true)
        })

        test('with different toValue return types', () => {
            const metadataWithNumber = {
                toValue: () => 42,
                toJson: () => ({ value: 42 }),
                type: 'number'
            }
            expect(isMeta(metadataWithNumber)).toBe(true)

            const metadataWithObject = {
                toValue: () => ({ nested: 'value' }),
                toJson: () => ({ nested: 'value' }),
                type: 'object'
            }
            expect(isMeta(metadataWithObject)).toBe(true)
        })

        test('with different type strings', () => {
            const types = ['string', 'number', 'boolean', 'object', 'array', 'custom']
            types.forEach(type => {
                const metadata = {
                    toValue: () => null,
                    toJson: () => ({}),
                    type
                }
                expect(isMeta(metadata)).toBe(true)
            })
        })
    })

    describe('should return false for invalid values', () => {
        test('null and undefined', () => {
            expect(isMeta(null)).toBe(false)
            expect(isMeta(undefined)).toBe(false)
        })

        test('non-object values', () => {
            expect(isMeta('string')).toBe(false)
            expect(isMeta(123)).toBe(false)
            expect(isMeta(true)).toBe(false)
            expect(isMeta(Symbol('test'))).toBe(false)
            expect(isMeta(() => { })).toBe(false)
        })

        test('objects missing toValue function', () => {
            const missingToValue = {
                toJson: () => ({}),
                type: 'string'
            }
            expect(isMeta(missingToValue)).toBe(false)
        })

        test('objects missing toJson function', () => {
            const missingToJson = {
                toValue: () => 'value',
                type: 'string'
            }
            expect(isMeta(missingToJson)).toBe(false)
        })

        test('objects missing type property', () => {
            const missingType = {
                toValue: () => 'value',
                toJson: () => ({})
            }
            expect(isMeta(missingType)).toBe(false)
        })

        test('objects where toValue is not a function', () => {
            const invalidToValue = {
                toValue: 'not a function',
                toJson: () => ({}),
                type: 'string'
            }
            expect(isMeta(invalidToValue)).toBe(false)
        })

        test('objects where toJson is not a function', () => {
            const invalidToJson = {
                toValue: () => 'value',
                toJson: 'not a function',
                type: 'string'
            }
            expect(isMeta(invalidToJson)).toBe(false)
        })

        test('objects where type is not a string', () => {
            const invalidType = {
                toValue: () => 'value',
                toJson: () => ({}),
                type: 123
            }
            expect(isMeta(invalidType)).toBe(false)
        })
    })

    describe('edge cases', () => {
        test('empty object', () => {
            expect(isMeta({})).toBe(false)
        })

        test('object with extra properties', () => {
            const metadataWithExtra = {
                toValue: () => 'value',
                toJson: () => ({}),
                type: 'string',
                extraProperty: 'should not matter'
            }
            expect(isMeta(metadataWithExtra)).toBe(true)
        })

        test('object with methods that throw', () => {
            const throwingMetadata = {
                toValue: () => { throw new Error('toValue error') },
                toJson: () => { throw new Error('toJson error') },
                type: 'string'
            }
            expect(isMeta(throwingMetadata)).toBe(true)
        })

        test('array objects', () => {
            expect(isMeta([])).toBe(false)

            const arrayWithProps = {
                toValue: () => 'value',
                toJson: () => ({}),
                type: 'array'
            }
            expect(isMeta(arrayWithProps)).toBe(true)
        })

        test('objects with property descriptors', () => {
            const metadata = Object.create(null, {
                toValue: { value: () => 'value', enumerable: true },
                toJson: { value: () => ({}), enumerable: true },
                type: { value: 'string', enumerable: true }
            })
            expect(isMeta(metadata)).toBe(true)
        })
    })
})