import { metadata } from "../../src/metadata"
import { expectError, expectToParse } from "./utils"
import { bool, nullable, number, object, string } from "../../src/metadata/builder"

describe('toObject', () => {
    describe('basic parsing', () => {
        test('should parse simple object', () => {
            const input = { id: 1, isActive: false }
            const meta = object({
                id: number(),
                isActive: bool()
            })
            expectToParse({ meta, raw: JSON.stringify(input) })
        })

        test('should parse full with native object', () => {
            const input = { id: 1, name: "name", isActive: false, phones: ["", ""], auth_method: nullable(string()) }
            const meta = metadata().from(input)
            expectToParse({ meta, raw: JSON.stringify({ ...input, auth_method: null }) })
            expectToParse({ meta, raw: JSON.stringify({ ...input, auth_method: "o2" }) })
        })

        test('should parse empty object', () => {
            const input = {}
            const meta = object({})
            expectToParse({ meta, raw: JSON.stringify(input) })
        })

        test('should parse big object', () => {
            const input = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`field_${i}`, false]))
            const meta = metadata().from(input)
            expectToParse({ meta, raw: JSON.stringify(input) })
        })
    })

    describe('error handling', () => {
        test('should throw error if more data presented', () => {
            const input = { id: 1, isActive: false }
            const meta = object({ id: number() })
            expectError({ meta, raw: JSON.stringify(input) })
        })

        test('should throw error if data not presented', () => {
            const input = { id: 1 }
            const meta = object({
                id: number(),
                isActive: bool()
            })
            expectError({ meta, raw: JSON.stringify(input) })
        })

        test('should throw error on trailing comma', () => {
            const input = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`field_${i}`, false]))
            const meta = metadata().from(input)
            const raw = JSON.stringify(input).replace('}', ',}')
            expectError({ meta, raw })
        })
    })
})