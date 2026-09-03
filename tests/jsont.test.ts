import { metadata } from '../src/metadata'
import { deserialize, serialize } from '../src'
import { array, bigInt, bool, date, i16, i32, i64, i8, map, nullable, number, object, set, string, u16, u32, u64, u8 } from '../src/metadata/builder'
import { BaseMeta } from '../src/metadata/types'
import { toBytes } from './converters/utils'
import dayjs from 'dayjs'

describe('jsont', () => {
    const cases = testCases()
    const meta = metadata()

    describe('deserializer', () => {
        cases.forEach((cs) => {
            test(cs.filename, () => {
                const text = JSON.stringify(cs.data)

                const expected = JSON.parse(text)

                if (cs.shouldFail) {
                    expect(() => {
                        const type = meta.from(expected)
                        deserialize(text, type)
                    }).toThrow()
                    expect(() => {
                        const type = meta.from(expected)
                        deserialize(toBytes(text), type)
                    }).toThrow()
                    return
                }

                const type = cs.meta ?? meta.from(expected)
                const custom = deserialize(text, type)
                expect(custom).toEqual(expected)

                const customFromBytes = deserialize(toBytes(text), type)
                expect(customFromBytes).toEqual(expected)
            })
        })

        test('custom-types', () => {
            const meta = object({
                id: i32(),
                name: string(),
                active: bool(),
                score: number(),
                codes: map(bool()),
                order: i64(),
                budget: u64(),
                created_at: date(),
                version: i8(),
                state: u8(),
                tags: set(string()),
                currency: u16(),
                symbol: i16(),
                last_audit: date(),
                user: nullable(object({
                    id: u32(),
                })),
                target: bigInt()
            })

            const json = `{
                    "id": 1,
                    "name": "Project Alpha",
                    "active": true,
                    "score": 99.5,
                    "codes": {
                        "ALPHA-001": true,
                        "ALPHA-002": false
                    },
                    "order": 9223372036854775800,
                    "budget": 9223372036854775807,
                    "created_at": "2025-01-15T10:30:00Z",
                    "version": 3,
                    "state": 233,
                    "tags": [
                        "new",
                        "changed",
                        "failed"
                    ],
                    "currency": 36,
                    "symbol": 32445,
                    "last_audit": "2025-03-20",
                    "user": {
                        "id": 12
                    },
                    "target": 534565745675968795435234375685678579546547564535342
                }`

            const expected = {
                "id": 1,
                "name": "Project Alpha",
                "active": true,
                "score": 99.5,
                "codes": new Map([
                    ["ALPHA-001", true],
                    ["ALPHA-002", false]
                ]),
                "order": 9223372036854775800n,
                "budget": 9223372036854775807n,
                "created_at": new Date("2025-01-15T10:30:00Z"),
                "version": 3,
                "state": 233,
                "tags": new Set([
                    "new",
                    "changed",
                    "failed"
                ]),
                "currency": 36,
                "symbol": 32445,
                "last_audit": dayjs("2025-03-20").toDate(),
                "user": {
                    "id": 12
                },
                "target": 534565745675968795435234375685678579546547564535342n
            }

            const res = deserialize(json, meta)
            expect(res).toEqual(expected)

            const resFromBytes = deserialize(toBytes(json), meta)
            expect(resFromBytes).toEqual(expected)
        })
    })

    describe('serializer', () => {
        cases.forEach((cs) => {
            test(cs.filename, () => {
                const json = JSON.stringify(cs.data)
                const value = JSON.parse(json)

                if (cs.shouldFail) {
                    expect(() => {
                        const type = meta.from(value)
                        serialize(value, type)
                    }).toThrow()
                    return
                }

                const type = cs.meta ?? meta.from(value)
                const custom = serialize(value, type)
                expect(custom).toEqual(json)
            })
        })
    })
})

type TestCase = {
    filename: string,
    data: unknown,
    shouldFail?: boolean,
    meta?: BaseMeta<any>
}

function testCases(): TestCase[] {
    return [
        {
            "filename": "string-simple.json",
            "data": "hello world"
        },
        {
            "filename": "string-empty.json",
            "data": ""
        },
        {
            "filename": "string-unicode.json",
            "data": "Hello 世界 🌍 𝄞"
        },
        {
            "filename": "string-escaped.json",
            "data": "Line1\nLine2\tTab\\Backslash\"Quote"
        },
        {
            "filename": "number-integer.json",
            "data": 42
        },
        {
            "filename": "number-negative.json",
            "data": -273
        },
        {
            "filename": "number-float.json",
            "data": 3.14159
        },
        {
            "filename": "number-scientific.json",
            "data": 6.022e23
        },
        {
            "filename": "number-negative-scientific.json",
            "data": -1.602e-19
        },
        {
            "filename": "number-zero.json",
            "data": 0
        },
        {
            "filename": "boolean-true.json",
            "data": true
        },
        {
            "filename": "boolean-false.json",
            "data": false
        },
        {
            "filename": "object-empty.json",
            "data": {}
        },
        {
            "filename": "object-simple.json",
            "data": {
                "name": "John",
                "age": 30,
                "active": true,
                "score": 98.6
            }
        },
        {
            "filename": "object-nested.json",
            "data": {
                "user": {
                    "id": 123,
                    "profile": {
                        "firstName": "Jane",
                        "lastName": "Doe",
                        "settings": {
                            "theme": "dark",
                            "notifications": false
                        }
                    }
                }
            }
        },
        {
            "filename": "object-deep-nested.json",
            "data": {
                "level1": {
                    "level2": {
                        "level3": {
                            "level4": {
                                "level5": {
                                    "value": "deep"
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            "filename": "object-complex.json",
            "data": {
                "string": "text",
                "number": 123.45,
                "boolean": true,
                "null": null,
                "object": { "key": "value" },
                "array": [1, 2, 3]
            },
            "meta": object({
                string: string(),
                number: number(),
                boolean: bool(),
                null: nullable(number()),
                object: object({
                    key: string()
                }),
                array: array(number()),
            })
        },
        {
            "filename": "array-empty.json",
            "data": [],
            "meta": array(number())
        },
        {
            "filename": "array-strings.json",
            "data": ["apple", "banana", "cherry", "date"]
        },
        {
            "filename": "array-numbers.json",
            "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        },
        {
            "filename": "array-booleans.json",
            "data": [true, false, true, false, true]
        },
        {
            "filename": "array-objects.json",
            "data": [
                { "id": 1, "name": "Item 1" },
                { "id": 2, "name": "Item 2" },
                { "id": 3, "name": "Item 3" }
            ]
        },
        {
            "filename": "array-nested.json",
            "data": [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ]
        },
        {
            "filename": "array-mixed-types.json",
            "data": [1, "two", 3.0, true, false],
            "shouldFail": true
        },
        {
            "filename": "array-mixed-objects.json",
            "data": [
                { "type": "A", "value": 1 },
                { "type": "B", "value": "text" },
                { "type": "C", "value": true }
            ],
            "shouldFail": true
        },
        {
            "filename": "null-simple.json",
            "data": null,
            "shouldFail": true
        },
        {
            "filename": "object-with-null.json",
            "data": {
                "name": "Test",
                "value": null,
                "active": true
            },
            "shouldFail": true
        },
        {
            "filename": "array-with-null.json",
            "data": [1, 2, null, 4, 5],
            "shouldFail": true
        },
        {
            "filename": "array-with-undefined.json",
            "data": [1, 2, , 4, 5],
            "shouldFail": true
        },
        {
            "filename": "large-numeric-array.json",
            "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        },
        {
            "filename": "large-object.json",
            "data": {
                "prop1": "value1",
                "prop2": "value2",
                "prop3": "value3",
                "prop4": "value4",
                "prop5": "value5",
                "prop6": "value6",
                "prop7": "value7",
                "prop8": "value8",
                "prop9": "value9",
                "prop10": "value10"
            }
        },
        {
            "filename": "array-of-arrays.json",
            "data": [
                [1, 2],
                [3, 4],
                [5, 6],
                [7, 8]
            ]
        },
        {
            "filename": "array-of-arrays-mixed.json",
            "data": [
                [1, 2],
                [3, 4, 5],
                [6, 7],
                [8, 9, 10, 11]
            ]
        },
        {
            "filename": "object-with-special-keys.json",
            "data": {
                "key-with-dash": "value",
                "key_with_underscore": "value",
                "key.with.dot": "value",
                "123numeric": "value",
                "": "empty key"
            }
        },
        {
            "filename": "string-with-whitespace.json",
            "data": "  leading and trailing  \n\t"
        },
        {
            "filename": "number-max-values.json",
            "data": {
                "maxInt": 9007199254740991,
                "minInt": -9007199254740991,
                "maxFloat": 1.7976931348623157e+308,
                "minFloat": 5e-324
            }
        },
        {
            "filename": "array-empty-objects.json",
            "data": [{}, {}, {}]
        },
        {
            "filename": "array-single-element.json",
            "data": ["single"]
        },
        {
            "filename": "object-single-property.json",
            "data": {
                "only": "property"
            }
        },
        {
            "filename": "string-escape-json-valid.json",
            "data": "{\"key\":\"value with \\\"quotes\\\" and \\\\backslashes and \\u00A9 copyright\"}"
        },
        {
            "filename": "mixed-structure.json",
            "data": {
                "metadata": {
                    "version": "1.0",
                    "timestamp": 1609459200,
                    "type": "test"
                },
                "data": [
                    {
                        "id": 1,
                        "values": [10, 20, 30],
                        "active": true,
                        "nested": {
                            "a": "a1",
                            "b": "b1"
                        }
                    },
                    {
                        "id": 2,
                        "values": [40, 50, 60],
                        "active": false,
                        "nested": {
                            "a": "a2",
                            "b": "b2"
                        }
                    }
                ],
                "summary": {
                    "total": 2,
                    "average": 35
                }
            }
        }
    ]
}