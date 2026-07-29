import { JSONT } from "../../src/metadata/baseTypes"
import { number, string } from "../../src/metadata/builder"
import { ConvertState } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { Stack } from "../../src/utils/stack"
import { ReadResultType } from "../../src/utils/types"

describe('metadata builders', () => {
    test('primitive number', () => {
        const meta = number()

        expect(meta).toHaveProperty('type', JSONT.NUMBER)
        expect(meta).toHaveProperty('toValue')
        expect(meta).toHaveProperty('toJson')

        expect(typeof meta.toValue).toBe('function')
        expect(meta.toValue.length).toBe(4)
        expect(typeof meta.toJson).toBe('function')
        expect(meta.toJson.length).toBe(3)

        const stack = new Stack<ConvertState>()
        const ctx = { reader: { bytes: new Uint8Array([49]), writable: false }, options: defaultOptions, stack: stack }
        expect(meta.toValue(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.COMPLETE, value: 1, nextIndex: 1 })
        expect(meta.toJson(meta, 1, defaultOptions)).toBe('1')
    })

    test('primitive string', () => {
        const meta = string()

        expect(meta).toHaveProperty('type', JSONT.STRING)
        expect(meta).toHaveProperty('toValue')
        expect(meta).toHaveProperty('toJson')

        expect(typeof meta.toValue).toBe('function')
        expect(meta.toValue.length).toBe(4)
        expect(typeof meta.toJson).toBe('function')
        expect(meta.toJson.length).toBe(3)

        const stack = new Stack<ConvertState>()
        const bytes = new TextEncoder().encode('"test"')
        const ctx = { reader: { bytes: bytes, writable: false }, options: defaultOptions, stack: stack }
        expect(meta.toValue(meta, ctx, 0, 0)).toStrictEqual({ type: ReadResultType.COMPLETE, value: "test", nextIndex: bytes.length })
        expect(meta.toJson(meta, "test", defaultOptions)).toBe('"test"')
    })
})