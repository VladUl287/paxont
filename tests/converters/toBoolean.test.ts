import { toBoolean } from "../../src/converters/boolean"
import { bool } from "../../src/metadata/builder"
import { ConvertState, ParseContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { A, E, F, L, R, S, T, U } from "../../src/utils/ascii_symbols"
import { JSONParseError } from "../../src/utils/error"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"

describe('toBoolean', () => {
    const createContext = (bytes: number[]): ParseContext => ({
        reader: {
            bytes: Uint8Array.from(bytes),
            writable: false
        },
        options: defaultOptions,
        stack: new Stack<ConvertState>()
    })

    const meta = bool()

    describe('TRUE conversion (lowercase)', () => {
        it('should return true when bytes contain "true" at the given index', () => {
            const ctx = createContext([116, 114, 117, 101]) // t, r, u, e
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: true, nextIndex: 4 })
        })

        it('should return true when "true" appears later in the buffer', () => {
            const ctx = createContext([0, 0, 116, 114, 117, 101]) // padding + true
            const result = toBoolean(meta, ctx, 2, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: true, nextIndex: 6 })
        })

        it('should return true even if there are extra bytes after "true"', () => {
            const ctx = createContext([116, 114, 117, 101, 0, 0, 0]) // true + padding
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: true, nextIndex: 4 })
        })
    })

    describe('FALSE conversion (lowercase)', () => {
        it('should return false when bytes contain "false" at the given index', () => {
            const ctx = createContext([102, 97, 108, 115, 101]) // f, a, l, s, e
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: 5 })
        })

        it('should return false when "false" appears later in the buffer', () => {
            const ctx = createContext([0, 0, 102, 97, 108, 115, 101]) // padding + false
            const result = toBoolean(meta, ctx, 2, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: 7 })
        })

        it('should return false even if there are extra bytes after "false"', () => {
            const ctx = createContext([102, 97, 108, 115, 101, 0, 0]) // false + padding
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: 5 })
        })
    })

    describe('Error handling - object field meta', () => {
        it('should throw error with field name when bytes do not match true/false and isObjectFieldMeta returns true', () => {
            const ctx = createContext([120, 121, 122]) // xyz - invalid

            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should throw error with field name when buffer is too short for "true"', () => {
            const ctx = createContext([116, 114, 117]) // tru (incomplete)
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should throw error with field name when buffer is too short for "false"', () => {
            const ctx = createContext([102, 97, 108, 115]) // fals (incomplete)
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('Error handling - non-object field meta', () => {
        it('should throw generic error when bytes do not match true/false and isObjectFieldMeta returns false', () => {
            const ctx = createContext([120, 121, 122]) // xyz - invalid
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should throw generic error when partial match but not exact', () => {
            const ctx = createContext([116, 114, 117, 120]) // trux - starts like true but ends differently
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should throw generic error for "falsx" pattern', () => {
            const ctx = createContext([102, 97, 108, 115, 120]) // falsx - starts like false but ends differently
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('Edge cases', () => {
        it('should handle index exactly at buffer end - true case', () => {
            const ctx = createContext([116, 114, 117]) // tru (3 bytes)
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should handle index exactly at buffer end - false case', () => {
            const ctx = createContext([102, 97, 108, 115]) // fals (4 bytes)
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should handle negative index gracefully', () => {
            const ctx = createContext([116, 114, 117, 101])
            expect(toBoolean(meta, ctx, -1, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should handle index beyond buffer length', () => {
            const ctx = createContext([116, 114, 117, 101])
            expect(toBoolean(meta, ctx, 10, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should treat lowercase as required - uppercase should fail', () => {
            const ctx = createContext([84, 82, 85, 69]) // TRUE (uppercase)
            expect(toBoolean(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('Buffer boundary tests', () => {
        it('should correctly check buffer length for "true" - exactly at boundary', () => {
            const ctx = createContext([116, 114, 117, 101]) // exactly 4 bytes
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: true, nextIndex: 4 })
        })

        it('should correctly check buffer length for "false" - exactly at boundary', () => {
            const ctx = createContext([102, 97, 108, 115, 101]) // exactly 5 bytes
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: 5 })
        })

        it('should handle index with insufficient remaining bytes for "true"', () => {
            const ctx = createContext([116, 114, 117, 101, 0, 0])
            const result = toBoolean(meta, ctx, 3, 0)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })

        it('should handle index with insufficient remaining bytes for "false"', () => {
            const ctx = createContext([102, 97, 108, 115, 101, 0])
            const result = toBoolean(meta, ctx, 2, 0)
            expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
        })
    })

    describe('Integration with actual constants', () => {
        it('should match the actual constant values', () => {
            expect(T).toBe(116) // 't'
            expect(R).toBe(114) // 'r'
            expect(U).toBe(117) // 'u'
            expect(E).toBe(101) // 'e'
            expect(F).toBe(102) // 'f'
            expect(A).toBe(97)  // 'a'
            expect(L).toBe(108) // 'l'
            expect(S).toBe(115) // 's'
        })

        it('should correctly identify "true" using imported constants', () => {
            const ctx = createContext([T, R, U, E])
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: true, nextIndex: 4 })
        })

        it('should correctly identify "false" using imported constants', () => {
            const ctx = createContext([F, A, L, S, E])
            const result = toBoolean(meta, ctx, 0, 0)
            expect(result).toStrictEqual({ type: ReadResultType.COMPLETE, value: false, nextIndex: 5 })
        })
    })
})