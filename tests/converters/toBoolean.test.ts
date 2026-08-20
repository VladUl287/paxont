import { toBoolean } from "../../src/converters/toValue/boolean"
import { bool } from "../../src/metadata/builder"
import { JsonParsingState, JsonParsingContext, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { A, E, F, L, R, S, T, U } from "../../src/utils/ascii_symbols"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { deserializePartially } from "./utils"

describe('toBoolean', () => {
    const createContext = (bytes: number[], writable = false, stack = new Stack<JsonParsingState>()): JsonParsingContext => {
        const bytesView = Uint8Array.from(bytes)
        return {
            reader: new JsonReader(bytesView, bytesView.length, writable),
            options: defaultOptions,
            stack: stack
        }
    }

    const meta = bool()

    const expectToParse = (meta: PrimitiveMeta<boolean>, bytes: Uint8Array, index = 0, depth = 0) => {
        const reader = new JsonReader(bytes, bytes.length, false)

        const ctx: JsonParsingContext = {
            reader: reader,
            options: defaultOptions,
            stack: new Stack(),
        }

        const actualValue = new TextDecoder().decode(bytes.subarray(index))
        const expectedResult = JSON.parse(actualValue)

        const value = meta.toValue(meta, ctx, index, depth)
        expect(value).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expectedResult,
            nextIndex: bytes.length
        })

        for (let i = 1; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks, index, depth)
            expect(result).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: expectedResult,
                nextIndex: chunks[0].length
            })
        }
    }

    describe('conversion', () => {
        it('should return true when bytes contain "true" at the given index', () => {
            const bytes = new Uint8Array([116, 114, 117, 101]) // t, r, u, e
            expectToParse(meta, bytes, 0, 0)
        })

        it('should return false when bytes contain "false" at the given index', () => {
            const bytes = new Uint8Array([102, 97, 108, 115, 101]) // f, a, l, s, e
            expectToParse(meta, bytes, 0, 0)
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
    })
})