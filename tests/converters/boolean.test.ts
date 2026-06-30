import { toBoolean } from "../../src/converters/boolean"
import { BaseMeta, ConvertCtx, ObjectFieldMeta } from "../../src/metadata/types"
import { A, E, F, L, R, S, T, U } from "../../src/utils/utf8constants"

const createMockCtx = (bytes: number[]): ConvertCtx => ({
    bytes: Uint8Array.from(bytes),
    options: {
        encoder: new TextEncoder(),
        decoder: new TextDecoder('utf-8', {
            fatal: true
        }),
        maxDepth: 64,
        allowTrailingCommas: false,
        fieldCaseInsensitive: false,
        allowDuplicateProperties: false
    }
})

const createMockMeta = (isObjectField = false, name = 'testField'): BaseMeta<boolean> => {
    if (isObjectField) {
        return <ObjectFieldMeta<any, any>>{
            type: 'boolean',
            toJson: (() => { }) as any,
            toValue: (() => { }) as any,
            name: {
                value: name,
                bytes: new TextEncoder().encode(name)
            }
        }
    }

    return {
        type: 'boolean',
        toJson: (() => { }) as any,
        toValue: (() => { }) as any
    }
}

describe('toBoolean', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('TRUE conversion (lowercase)', () => {
        it('should return true when bytes contain "true" at the given index', () => {
            const ctx = createMockCtx([116, 114, 117, 101]) // t, r, u, e
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)

            expect(result).toBe(true)
        })

        it('should return true when "true" appears later in the buffer', () => {
            const ctx = createMockCtx([0, 0, 116, 114, 117, 101]) // padding + true
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 2, 0)

            expect(result).toBe(true)
        })

        it('should return true even if there are extra bytes after "true"', () => {
            const ctx = createMockCtx([116, 114, 117, 101, 0, 0, 0]) // true + padding
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)

            expect(result).toBe(true)
        })
    })

    describe('FALSE conversion (lowercase)', () => {
        it('should return false when bytes contain "false" at the given index', () => {
            const ctx = createMockCtx([102, 97, 108, 115, 101]) // f, a, l, s, e
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)

            expect(result).toBe(false)
        })

        it('should return false when "false" appears later in the buffer', () => {
            const ctx = createMockCtx([0, 0, 102, 97, 108, 115, 101]) // padding + false
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 2, 0)

            expect(result).toBe(false)
        })

        it('should return false even if there are extra bytes after "false"', () => {
            const ctx = createMockCtx([102, 97, 108, 115, 101, 0, 0]) // false + padding
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)

            expect(result).toBe(false)
        })
    })

    describe('Error handling - object field meta', () => {
        it('should throw error with field name when bytes do not match true/false and isObjectFieldMeta returns true', () => {
            const ctx = createMockCtx([120, 121, 122]) // xyz - invalid
            const meta = createMockMeta(true, 'myField')

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow(
                "invalid boolean: field 'myField', at index 0"
            )
        })

        it('should throw error with field name when buffer is too short for "true"', () => {
            const ctx = createMockCtx([116, 114, 117]) // tru (incomplete)
            const meta = createMockMeta(true, 'shortField')

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow(
                "invalid boolean: field 'shortField', at index 0"
            )
        })

        it('should throw error with field name when buffer is too short for "false"', () => {
            const ctx = createMockCtx([102, 97, 108, 115]) // fals (incomplete)
            const meta = createMockMeta(true, 'incompleteField')

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow(
                "invalid boolean: field 'incompleteField', at index 0"
            )
        })
    })

    describe('Error handling - non-object field meta', () => {
        it('should throw generic error when bytes do not match true/false and isObjectFieldMeta returns false', () => {
            const ctx = createMockCtx([120, 121, 122]) // xyz - invalid
            const meta = createMockMeta(false)


            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow(
                "invalid boolean, at index 0"
            )
        })

        it('should throw generic error when partial match but not exact', () => {
            const ctx = createMockCtx([116, 114, 117, 120]) // trux - starts like true but ends differently
            const meta = createMockMeta(false)


            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow(
                "invalid boolean, at index 0"
            )
        })

        it('should throw generic error for "falsx" pattern', () => {
            const ctx = createMockCtx([102, 97, 108, 115, 120]) // falsx - starts like false but ends differently
            const meta = createMockMeta(false)

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow(
                "invalid boolean, at index 0"
            )
        })
    })

    describe('Edge cases', () => {
        it('should handle index exactly at buffer end - true case', () => {
            const ctx = createMockCtx([116, 114, 117]) // tru (3 bytes)
            const meta = createMockMeta(false)

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow()
        })

        it('should handle index exactly at buffer end - false case', () => {
            const ctx = createMockCtx([102, 97, 108, 115]) // fals (4 bytes)
            const meta = createMockMeta(false)

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow()
        })

        it('should handle negative index gracefully', () => {
            const ctx = createMockCtx([116, 114, 117, 101])
            const meta = createMockMeta(false)

            expect(() => toBoolean(ctx, meta, -1, 0)).toThrow()
        })

        it('should handle index beyond buffer length', () => {
            const ctx = createMockCtx([116, 114, 117, 101])
            const meta = createMockMeta(false)

            expect(() => toBoolean(ctx, meta, 10, 0)).toThrow()
        })

        it('should treat lowercase as required - uppercase should fail', () => {
            const ctx = createMockCtx([84, 82, 85, 69]) // TRUE (uppercase)
            const meta = createMockMeta(false)

            expect(() => toBoolean(ctx, meta, 0, 0)).toThrow()
        })
    })

    describe('Buffer boundary tests', () => {
        it('should correctly check buffer length for "true" - exactly at boundary', () => {
            const ctx = createMockCtx([116, 114, 117, 101]) // exactly 4 bytes
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)
            expect(result).toBe(true)
        })

        it('should correctly check buffer length for "false" - exactly at boundary', () => {
            const ctx = createMockCtx([102, 97, 108, 115, 101]) // exactly 5 bytes
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)
            expect(result).toBe(false)
        })

        it('should handle index with insufficient remaining bytes for "true"', () => {
            const ctx = createMockCtx([116, 114, 117, 101, 0, 0])
            const meta = createMockMeta(false)

            // Start at index 3, only 3 bytes remaining but need 4 for "true"
            expect(() => toBoolean(ctx, meta, 3, 0)).toThrow()
        })

        it('should handle index with insufficient remaining bytes for "false"', () => {
            const ctx = createMockCtx([102, 97, 108, 115, 101, 0])
            const meta = createMockMeta(false)

            // Start at index 2, only 4 bytes remaining but need 5 for "false"
            expect(() => toBoolean(ctx, meta, 2, 0)).toThrow()
        })
    })

    describe('Integration with actual constants', () => {
        it('should match the actual constant values', () => {
            // Verify the constants match lowercase letters
            expect(T).toBe(116) // 't'
            expect(R).toBe(114) // 'r'
            expect(U).toBe(117) // 'u'
            expect(E).toBe(101) // 'e'
            expect(F).toBe(102) // 'f'
            expect(A).toBe(97)  // 'a'
            expect(L).toBe(108) // 'l'
            expect(S).toBe(115) // 's'

            // Note: E_UPPER (69) exists but isn't used in this function
        })

        it('should correctly identify "true" using imported constants', () => {
            const ctx = createMockCtx([T, R, U, E])
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)
            expect(result).toBe(true)
        })

        it('should correctly identify "false" using imported constants', () => {
            const ctx = createMockCtx([F, A, L, S, E])
            const meta = createMockMeta()

            const result = toBoolean(ctx, meta, 0, 0)
            expect(result).toBe(false)
        })
    })
})