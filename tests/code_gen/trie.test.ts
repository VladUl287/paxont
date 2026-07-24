import { generateTrie as generate } from "../../src/code_gen/trie"

describe('generate', () => {
    const encoder = new TextEncoder()
    const strToUint8 = (str: string): Uint8Array => {
        return encoder.encode(str)
    }

    describe('basic functionality', () => {
        it('should return a function', () => {
            const values = [strToUint8('abc')]
            const result = generate(values)
            expect(typeof result).toBe('function')
        })

        it('should return -1 when no match is found', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const input = strToUint8('xyz')

            const result = matcher(input, 0)
            expect(result).toBe(-1)
        })

        it('should return the index of the match when a pattern is found', () => {
            const values = [strToUint8('abc'), strToUint8('bca')]
            const matcher = generate(values)
            const input = strToUint8('bca')

            const result = matcher(input, 0)
            expect(result).toBe(1)
        })

        it('should find matches at different offsets', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const input = strToUint8('xyzabc')

            const result = matcher(input, 3)
            expect(result).toBe(0)
        })
    })

    describe('longest match selection', () => {
        it('should return the longest match when multiple patterns match', () => {
            const values = [
                strToUint8('abc'),
                strToUint8('abcdef'),
                strToUint8('ab')
            ]
            const matcher = generate(values)
            const input = strToUint8('abcdef')

            const result = matcher(input, 0)
            expect(result).toBe(1)
        })

        it('should handle overlapping matches correctly', () => {
            const values = [
                strToUint8('abc'),
                strToUint8('bc'),
                strToUint8('c')
            ]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })

        it('should prefer longer match even if shorter match starts earlier', () => {
            const values = [
                strToUint8('a'),
                strToUint8('abc')
            ]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 0)
            expect(result).toBe(1)
        })

        it('should handle patterns of different lengths correctly', () => {
            const values = [
                strToUint8('hello'),
                strToUint8('hello world'),
                strToUint8('hell')
            ]
            const matcher = generate(values)
            const input = strToUint8('hello world')

            const result = matcher(input, 0)
            expect(result).toBe(1)
        })
    })

    describe('complex patterns', () => {
        it('should match patterns with special characters', () => {
            const values = [strToUint8('hello\nworld')]
            const matcher = generate(values)
            const input = strToUint8('hello\nworld')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })

        it('should match binary data', () => {
            const values = [new Uint8Array([0x00, 0x01, 0x02, 0x03])]
            const matcher = generate(values)
            const input = new Uint8Array([0x00, 0x01, 0x02, 0x03])

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })

        it('should match patterns with null bytes', () => {
            const values = [new Uint8Array([0x00, 0x41, 0x00, 0x42])]
            const matcher = generate(values)
            const input = new Uint8Array([0x00, 0x41, 0x00, 0x42])

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })
    })

    describe('edge cases', () => {
        it('should handle empty values array', () => {
            const values: Uint8Array[] = []
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 0)
            expect(result).toBe(-1)
        })

        it('should handle empty pattern', () => {
            const values = [new Uint8Array([])]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })

        it('should handle empty input', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const input = new Uint8Array([])

            const result = matcher(input, 0)
            expect(result).toBe(-1)
        })

        it('should handle empty input with empty pattern', () => {
            const values = [new Uint8Array([])]
            const matcher = generate(values)
            const input = new Uint8Array([])

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })

        it('should handle patterns longer than input', () => {
            const values = [strToUint8('abcdefghijklmnopqrstuvwxyz')]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 0)
            expect(result).toBe(-1)
        })

        it('should handle offset that is out of bounds', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 10)
            expect(result).toBe(-1)
        })

        it('should handle negative offset', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, -1)
            expect(result).toBe(-1)
        })
    })

    describe('performance and boundary conditions', () => {
        it('should handle large input', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const largeStr = 'x'.repeat(10000) + 'abc'
            const input = strToUint8(largeStr)

            const result = matcher(input, 10000)
            expect(result).toBe(0)
        })

        it('should handle unicode characters correctly', () => {
            const values = [strToUint8('😀🎉🌟')]
            const matcher = generate(values)
            const input = strToUint8('😀🎉🌟')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })

        it('should handle UTF-8 multi-byte characters correctly', () => {
            const values = [strToUint8('café')]
            const matcher = generate(values)
            const input = strToUint8('café')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })
    })

    describe('duplicate patterns', () => {
        it('should handle duplicate patterns', () => {
            const values = [
                strToUint8('abc'),
                strToUint8('abc'),
                strToUint8('abc')
            ]
            const matcher = generate(values)
            const input = strToUint8('abc')

            const result = matcher(input, 0)
            expect(result).toBe(2)
        })

        it('should handle multiple identical patterns and longer patterns', () => {
            const values = [
                strToUint8('abc'),
                strToUint8('abc'),
                strToUint8('abcdef'),
                strToUint8('abc')
            ]
            const matcher = generate(values)
            const input = strToUint8('abcdef')

            const result = matcher(input, 0)
            expect(result).toBe(2)
        })
    })

    describe('partial matches', () => {
        it('should not match partial patterns', () => {
            const values = [strToUint8('hello world')]
            const matcher = generate(values)
            const input = strToUint8('hello')

            const result = matcher(input, 0)
            expect(result).toBe(-1)
        })

        it('should find match if pattern is fully contained', () => {
            const values = [strToUint8('hello world')]
            const matcher = generate(values)
            const input = strToUint8('hello world!')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })
    })

    describe('case sensitivity', () => {
        it('should be case sensitive by default', () => {
            const values = [strToUint8('Hello')]
            const matcher = generate(values)
            const input = strToUint8('hello')

            const result = matcher(input, 0)
            expect(result).toBe(-1)
        })

        it('should match exact byte values', () => {
            const values = [strToUint8('HELLO')]
            const matcher = generate(values)
            const input = strToUint8('HELLO')

            const result = matcher(input, 0)
            expect(result).toBe(0)
        })
    })

    describe('multiple matches at different positions', () => {
        it('should find match at different positions in the input', () => {
            const values = [strToUint8('abc')]
            const matcher = generate(values)
            const input = strToUint8('xyzabc123abc')

            expect(matcher(input, 0)).toBe(-1)
            expect(matcher(input, 3)).toBe(0)
            expect(matcher(input, 6)).toBe(-1)
            expect(matcher(input, 9)).toBe(0)
        })

        it('should handle overlapping matches at different positions', () => {
            const values = [strToUint8('aa')]
            const matcher = generate(values)
            const input = strToUint8('aaa')

            expect(matcher(input, 0)).toBe(0)
            expect(matcher(input, 1)).toBe(0)
        })
    })
})