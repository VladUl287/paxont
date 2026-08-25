import { bool } from "../../src/metadata/builder"
import { A, E, F, L, R, S, T, U } from "../../src/utils/ascii_symbols"
import { expectError, expectToParse } from "./utils"

describe('toBoolean', () => {
    const meta = bool()

    describe('conversion', () => {
        it('should return true when bytes contain "true" at the given index', () => {
            const bytes = new Uint8Array([116, 114, 117, 101]) //t, r, u, e
            expectToParse({ meta, bytes })
        })

        it('should return false when bytes contain "false" at the given index', () => {
            const bytes = new Uint8Array([102, 97, 108, 115, 101]) // f, a, l, s, e
            expectToParse({ meta, bytes })
        })
    })

    describe('Error handling - object field meta', () => {
        it('should throw error with field name when buffer is too short for "true"', () => {
            const bytes = new Uint8Array([116, 114, 117])
            expectError({ meta, bytes })
        })

        it('should throw error with field name when buffer is too short for "false"', () => {
            const bytes = new Uint8Array([102, 97, 108, 115])
            expectError({ meta, bytes })
        })

        it('should throw generic error when partial match but not exact', () => {
            const bytes = new Uint8Array([116, 114, 117, 120])
            expectError({ meta, bytes })
        })

        it('should throw generic error for "falsx" pattern', () => {
            const bytes = new Uint8Array([102, 97, 108, 115, 120])
            expectError({ meta, bytes })
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