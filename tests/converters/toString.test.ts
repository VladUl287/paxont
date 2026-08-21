import { stringParser } from "../../src/converters/toValue/string"
import { string } from "../../src/metadata/builder"
import { BaseMeta, JsonParsingContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { utf16LeDecoder, utf16LeDecoderForBuffer } from "../../src/utils/utf16"
import { utf8Decoder, utf8DecoderForBuffer } from "../../src/utils/utf8"
import { deserializePartially } from "./utils"

describe('tryParseString', () => {
    const encoder = new TextEncoder()

    function expectError<M extends BaseMeta<any>>(meta: M, { bytes, name, description }: {
        name: string;
        bytes: Uint8Array<ArrayBuffer>;
        description: string;
    }) {
        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        try {
            const result = meta.toValue(meta, context, 0, 0)
            expect(result).toStrictEqual({
                type: ReadResultType.ERROR,
                error: expect.any(JSONParseError)
            })

            for (let i = 0; i < bytes.length; i++) {
                const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
                const result = deserializePartially(meta, chunks)

                expect(result).toStrictEqual({
                    type: ReadResultType.ERROR,
                    error: expect.any(JSONParseError)
                })
            }
        } catch (error) {
            console.log(name, description)
            throw error
        }
    }

    const expectToParse = <M extends BaseMeta<any>>(meta: M, str: string) => {
        const bytes = encoder.encode(str)

        const expectedResult = str.substring(1, str.length - 1)

        const value = meta.toValue(meta, {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack(),
        }, 0, 0)
        expect(value).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expectedResult,
            nextIndex: bytes.length
        })

        const valueRaw = meta.toValue(meta, {
            reader: new JsonReader(encoder.encode(str), bytes.length, false, str),
            options: defaultOptions,
            stack: new Stack(),
        }, 0, 0)
        expect(valueRaw).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: expectedResult,
            nextIndex: bytes.length
        })

        const step = bytes.length > 65_536 ? 10 : 1
        for (let i = 0; i < bytes.length; i += step) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()

            try {
                const result = deserializePartially(meta, chunks)

                expect(result).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: expectedResult,
                    nextIndex: chunks[0].length
                })
            }
            catch (error) {
                console.log(error)
            }
        }
    }

    const meta = string()
    const jsonStrings = jsonTestStrings()
    const invalidJsonStrings = jsonTestInvalidStrings()

    test('utf16 string parser buffer', () => {
        const { toString } = stringParser({
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoderForBuffer
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })
    })

    test('utf16 string parser decoder', () => {
        const { toString } = stringParser({
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoder
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })
    })

    test('utf8 string parser buffer', () => {
        const { toString } = stringParser({
            useUtf16: false,
            utf8Decoder: utf8DecoderForBuffer
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })
    })

    test('utf8 string parser decoder', () => {
        const { toString } = stringParser({
            useUtf16: false,
            utf8Decoder: utf8Decoder
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })
    })

    test('utf16 restrict memory string parser buffer', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoderForBuffer
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })

        const veryLongString = `"${"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐".repeat(700)}"`
        expectToParse({ ...meta, toValue: toString }, veryLongString)
    })

    test('utf16 restrict memory string parser decoder', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoder
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })

        const veryLongString = `"${"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐".repeat(700)}"`
        expectToParse({ ...meta, toValue: toString }, veryLongString)
    })

    test('utf8 restrict memory string parser buffer', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: false,
            utf8Decoder: utf8DecoderForBuffer
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })

        const veryLongString = `"${"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐".repeat(700)}"`
        expectToParse({ ...meta, toValue: toString }, veryLongString)
    })

    test('utf8 restrict memory string parser decoder', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: false,
            utf8Decoder: utf8Decoder
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })

        const veryLongString = `"${"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐".repeat(700)}"`
        expectToParse({ ...meta, toValue: toString }, veryLongString)
    })

    test('wasmless string parser', () => {
        const { toString } = stringParser({
            wasmInstance: (b, m) => undefined
        })
        jsonStrings
            .forEach(str => {
                expectToParse({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf16 string parser buffer', () => {
        const { toString } = stringParser({
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoderForBuffer
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf16 string parser decoder', () => {
        const { toString } = stringParser({
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoder
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf8 string parser buffer', () => {
        const { toString } = stringParser({
            useUtf16: false,
            utf8Decoder: utf8DecoderForBuffer,
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf8 string parser decoder', () => {
        const { toString } = stringParser({
            useUtf16: false,
            utf8Decoder: utf8Decoder
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf16 restrict memory string parser buffer', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoderForBuffer
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf16 restrict memory string parser decoder', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: true,
            utf16LeDecoder: utf16LeDecoder
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf8 restrict memory string parser buffer', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: false,
            utf8Decoder: utf8DecoderForBuffer
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings utf8 restrict memory string parser decoder', () => {
        const { toString } = stringParser({
            maxMemoryPages: 1,
            useUtf16: false,
            utf8Decoder: utf8Decoder
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })

    test('invalid strings wasmless string parser', () => {
        const { toString } = stringParser({
            wasmInstance: (b, m) => undefined
        })
        invalidJsonStrings
            .forEach(str => {
                expectError({ ...meta, toValue: toString }, str)
            })
    })
})

function jsonTestStrings() {
    return [
        // Basic ASCII (1-byte sequences)
        "\"Hello World\"",
        "\"1234567890\"",
        "\"!@#$%^&*()\"",
        "\"The quick brown fox jumps over the lazy dog\"",

        // (2-byte sequences)
        "\"Café\"",
        "\"résumé\"",
        "\"naïve\"",
        "\"Noël\"",
        "\"façade\"",
        "\"über\"",
        "\"Müller\"",
        "\"São Paulo\"",
        "\"Ångström\"",
        "\"Æsop\"",
        "\"Česká republika\"",
        "\"Polska\"",
        "\"Россия\"",
        "\"Ελλάδα\"",
        "\"България\"",
        "\"العربية\"", // Arabic
        "\"עברית\"", // Hebrew
        "\"فارسی\"", // Persian

        // Asian characters (3-byte sequences)
        "\"你好世界\"", // Chinese
        "\"こんにちは\"", // Japanese
        "\"안녕하세요\"", // Korean
        "\"汉语\"", // Chinese
        "\"日本語\"", // Japanese

        // Emoji and special symbols (4-byte sequences)
        "\"😀😁😂🤣😃😄😅😆\"",
        "\"❤️🧡💛💚💙💜\"",
        "\"⭐🌟✨⚡🔥\"",
        "\"🌍🌎🌏🌐\"",
        "\"🎉🎊🎈🎁\"",
        "\"👍👎👊✊🤛🤜\"",
        "\"🚀🛸🌙☀️\"",
        "\"💻📱⌨️🖥️\"",

        // Mathematical and technical symbols (3-byte sequences)
        "\"∑∏∫∂√∞\"",
        "\"∀∃∄∈∉\"",
        "\"αβγδεζηθ\"",
        "\"≈≠≤≥±÷×\"",

        // Punctuation and spaces
        "\"—–…\"",
        "\"«»„“”\"",
        "\" \"", // Non-breaking space
        "\"　\"", // Ideographic space

        // Control characters (should be handled carefully)
        "\"\\u0000\"", // NULL
        "\"\\u0007\"", // BELL
        "\"\\u001B\"", // ESC
        "\"\\u007F\"", // DELETE

        // Invalid/edge cases (for testing error handling)
        "\"\\uD800\"", // Surrogate half (invalid in UTF-8)
        "\"\\uDFFF\"", // Surrogate half (invalid in UTF-8)
        "\"\\uFFFE\"", // Non-character
        "\"\\uFFFF\"", // Non-character

        // Mixed scripts
        "\"English 中文 日本語 한국어 العربية\"",
        "\"Hello 世界 🌍\"",
        "\"Café au lait ☕\"",

        // Long strings
        "\"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐\"",
        "\"Testing various special characters: ∑∏∫∂√∞ ≈≠≤≥±÷× ∀∃∄∈∉ αβγδεζηθ\"",

        // Strings with combining characters
        "\"e\\u0301\"", // é (e + combining acute accent)
        "\"n\\u0303\"", // ñ (n + combining tilde)
        "\"a\\u0308\"", // ä (a + combining diaeresis)
        "\"u\\u0302\"", // û (u + combining circumflex)

        // Zero-width characters
        "\"\\u200B\"", // Zero-width space
        "\"\\u200C\"", // Zero-width non-joiner
        "\"\\u200D\"", // Zero-width joiner
        "\"\\uFEFF\"", // Byte order mark

        // Musical symbols (3-byte sequences)
        "\"♩♪♫♬\"",

        // Currency symbols
        "\"$€£¥₣₤₧₨₩₪₫₭₮₯\"",

        // Arrow symbols
        "\"←↑→↓↔↕↖↗↘↙\"",

        // Box drawing characters
        "\"─│┌┐└┘├┤┬┴┼\"",

        // Edge case: Maximum 4-byte sequence (valid Unicode)
        "\"\\u{10FFFF}\"", // Maximum valid Unicode code point

        // Edge case: Minimum 4-byte sequence
        "\"\\u{10000}\"", // First valid 4-byte sequence

        // Zero-length string
        "\"\"",

        // Whitespace variations
        "\"   \"", // Spaces
        "\"\\t\"", // Tab
        "\"\\n\"", // Newline
        "\"\\r\\n\"", // CRLF

        // Mixed case and accents
        "\"ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ\"",
        "\"àáâãäåæçèéêëìíîï\"",

        // Nordic characters
        "\"ÅÄÖåäö\"",
        "\"ÆØÅæøå\"",

        // Baltic characters
        "\"ĄČĘĖĮŠŲŪŽąčęėįšųūž\"",

        // Turkish characters
        "\"ĞİŞÖÜğışöüç\"",

        // Vietnamese characters
        "\"ĂÂĐÊÔƠƯăâđêôơư\"",
        "\"àáảãạăắằẳẵặâấầẩẫậ\"",

        // Thai characters
        "\"สวัสดี\"", // Hello in Thai

        // Hindi/Devanagari
        "\"नमस्ते\"", // Hello in Hindi

        // Tibetan
        "\"༄༅༆༇༈\"",

        // Runes
        "\"ᚠᚢᚦᚨᚩ\"",

        // Cherokee
        "\"ᎠᎡᎢᎣᎤ\"",

        // Very long string
        `"${"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐".repeat(100)}"`
    ]
}

function jsonTestInvalidStrings() {
    return [
        // 1. Continuation byte without leading byte (invalid starting byte)
        {
            name: "Lone continuation byte (0x80)",
            bytes: new Uint8Array([34, 0x80, 34]),
            description: "Starts with continuation byte 10xxxxxx"
        },
        {
            name: "Lone continuation byte (0xBF)",
            bytes: new Uint8Array([34, 0xBF, 34]),
            description: "Starts with continuation byte 10xxxxxx"
        },

        // 2. Invalid leading bytes
        {
            name: "Invalid leading byte 0xC0 (overlong encoding for NUL)",
            bytes: new Uint8Array([34, 0xC0, 0x80, 34]),
            description: "Overlong encoding - should be 0x00"
        },
        {
            name: "Invalid leading byte 0xC1 (overlong encoding)",
            bytes: new Uint8Array([34, 0xC1, 0xBF, 34]),
            description: "Overlong encoding - should be max 0x7F"
        },
        {
            name: "Invalid leading byte 0xF5 (above Unicode max)",
            bytes: new Uint8Array([34, 0xF5, 0x80, 0x80, 0x80, 34]),
            description: "Starts with byte > 0xF4 (invalid)"
        },
        {
            name: "Invalid leading byte 0xFF (not valid UTF-8)",
            bytes: new Uint8Array([34, 0xFF, 0x80, 0x80, 0x80, 34]),
            description: "Byte 0xFF is never valid in UTF-8"
        },
        {
            name: "Invalid leading byte 0xFE (not valid UTF-8)",
            bytes: new Uint8Array([34, 0xFE, 0xBF, 0xBF, 0xBF, 34]),
            description: "Byte 0xFE is never valid in UTF-8"
        },

        // 3. Incomplete sequences (missing continuation bytes)
        {
            name: "Incomplete 2-byte sequence (missing second byte)",
            bytes: new Uint8Array([34, 0xC2, 34]),
            description: "2-byte sequence missing continuation byte"
        },
        {
            name: "Incomplete 3-byte sequence (missing continuation bytes)",
            bytes: new Uint8Array([34, 0xE0, 0xA0, 34]),
            description: "3-byte sequence missing one continuation byte"
        },
        {
            name: "Incomplete 4-byte sequence (missing continuation bytes)",
            bytes: new Uint8Array([34, 0xF0, 0x90, 34]),
            description: "4-byte sequence missing continuation bytes"
        },

        // 4. Missing bytes in middle of sequence
        {
            name: "Missing byte in 3-byte sequence",
            bytes: new Uint8Array([34, 0xE0, 0x80, 0xBF, 0xE0, 0xA0, 34]), // cut in middle
            description: "Invalid sequence with missing continuation byte in middle"
        },

        // 5. Continuation bytes in wrong order
        {
            name: "Continuation bytes without proper leading sequence",
            bytes: new Uint8Array([34, 0xE0, 0xBF, 0x80, 0xBF, 34]),
            description: "Extra continuation bytes after valid sequence"
        },

        // 6. Overlong encodings
        {
            name: "Overlong '/' (should be 0x2F)",
            bytes: new Uint8Array([34, 0xC0, 0xAF, 34]),
            description: "Overlong encoding of '/' character"
        },
        {
            name: "Overlong space (should be 0x20)",
            bytes: new Uint8Array([34, 0xC0, 0xA0]),
            description: "Overlong encoding of space character"
        },
        {
            name: "Overlong '€' (should be 0xE2, 0x82, 0xAC)",
            bytes: new Uint8Array([34, 0xF0, 0x82, 0x82, 0xAC, 34]),
            description: "Overlong encoding of Euro sign"
        },

        // 7. Surrogate halves (invalid in UTF-8)
        {
            name: "Surrogate half (0xD800)",
            bytes: new Uint8Array([34, 0xED, 0xA0, 0x80, 34]),
            description: "UTF-16 surrogate half (should be invalid)"
        },
        {
            name: "Surrogate half (0xDFFF)",
            bytes: new Uint8Array([34, 0xED, 0xBF, 0xBF, 34]),
            description: "UTF-16 surrogate half (should be invalid)"
        },

        // 8. Values above Unicode maximum (U+10FFFF)
        {
            name: "Above Unicode max (U+110000)",
            bytes: new Uint8Array([34, 0xF4, 0x90, 0x80, 0x80, 34]),
            description: "Value > U+10FFFF (invalid)"
        },
        {
            name: "Above Unicode max (U+1FFFFF)",
            bytes: new Uint8Array([34, 0xF8, 0x88, 0x80, 0x80, 0x80, 34]),
            description: "5-byte sequence (invalid in modern UTF-8)"
        },

        // 9. Mixed valid and invalid sequences
        {
            name: "Valid text with invalid byte inserted",
            bytes: new Uint8Array([34, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x80, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64, 34]),
            description: "\"Hello World\" with invalid 0x80 inserted"
        },
        {
            name: "Valid sequence followed by invalid continuation",
            bytes: new Uint8Array([34, 0xE2, 0x82, 0xAC, 0x80, 0xE2, 0x82]),
            description: "Euro sign followed by invalid continuation and incomplete sequence"
        },

        // 10. Various malformed multi-byte sequences
        {
            name: "3-byte with wrong continuation (0xC0 instead of 0x80-0xBF)",
            bytes: new Uint8Array([34, 0xE1, 0x80, 0xC0, 34]),
            description: "Last byte not in 0x80-0xBF range"
        },
        {
            name: "3-byte with ASCII in middle (should be continuation)",
            bytes: new Uint8Array([34, 0xE1, 0x41, 0x80, 34]),
            description: "ASCII character 'A' in middle of 3-byte sequence"
        },

        // 11. Truncated at end of stream
        {
            name: "Truncated 3-byte sequence at end",
            bytes: new Uint8Array([34, 0xE2, 0x82, 34]),
            description: "Incomplete 3-byte sequence at end of stream"
        },
        {
            name: "Truncated 4-byte sequence at end",
            bytes: new Uint8Array([34, 0xF0, 0x9F, 0x92, 34]),
            description: "Incomplete 4-byte sequence at end of stream"
        },

        // 12. Boundary conditions
        {
            name: "Minimum 2-byte with invalid continuation",
            bytes: new Uint8Array([34, 0xC2, 0x7F]),
            description: "Continuation byte must be >= 0x80"
        },
        {
            name: "Maximum 2-byte with invalid continuation",
            bytes: new Uint8Array([34, 0xDF, 0xFF]),
            description: "Continuation byte must be <= 0xBF"
        },
        {
            name: "Minimum 3-byte with invalid continuation",
            bytes: new Uint8Array([34, 0xE0, 0xA0, 0x7F, 34]),
            description: "Continuation byte must be >= 0x80"
        },

        // 14. Zero-length/malformed edge cases
        {
            name: "Empty byte array",
            bytes: new Uint8Array([]),
            description: "Empty sequence (should decode to empty string)"
        },
        {
            name: "Single invalid byte 0xC0",
            bytes: new Uint8Array([34, 0xC0, 34]),
            description: "Invalid leading byte without continuation"
        },
        {
            name: "Multiple lone continuation bytes",
            bytes: new Uint8Array([34, 0x80, 0xBF, 0x80, 0xBF, 34]),
            description: "Multiple continuation bytes without leaders"
        },

        // 15. Real-world corrupted text examples
        {
            name: "Corrupted 'café' (cafÃ©)",
            bytes: new Uint8Array([34, 0x63, 0x61, 0x66, 0xC3, 0x83, 0x63, 0x83, 0xA9, 34]),
            description: "Mojibake/Corrupted 'café'"
        },
        {
            name: "Corrupted emoji",
            bytes: new Uint8Array([34, 0xF0, 0x9F, 0x98, 0x80, 0x80, 0xF0, 0x9F, 34]),
            description: "Corrupted 😀 emoji sequence"
        },
    ]
}