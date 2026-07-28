import { JSONT } from "../../src/metadata/baseTypes"
import { number } from "../../src/metadata/builder"

describe('metadata builders', () => {
    test('primitive number', () => {
        const meta = number()

        expect(meta.type).toBe(JSONT.NUMBER)
        expect(typeof meta.toValue).toBe('function')
        expect(meta.toValue.length).toBe(4)
        expect(typeof meta.toJson).toBe('function')
        expect(meta.toJson.length).toBe(3)
    })
})