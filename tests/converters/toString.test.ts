import { createStringParser, defaultParseOptions } from "../../src/converters/string"
import { JsonReader, ParseContext, PrimitiveMeta } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { Stack } from "../../src/utils/stack"
import { isComplete, isNeedsMoreData, ReadResult, ReadResultType } from "../../src/utils/types"

describe('tryParseString', () => {
    const encoder = new TextEncoder()

    const expectToParse = (toString: PrimitiveMeta<string>['toValue'], str: string) => {
        const bytes = encoder.encode(str)

        const reader: JsonReader = {
            bytes: bytes,
            writable: false
        }

        const ctx: ParseContext = {
            reader: reader,
            options: defaultOptions,
            stack: new Stack(),
        }

        const metaMock: any = {}

        const value = toString(metaMock, ctx, 0, 0)

        expect(value).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: str.substring(1, str.length - 1),
            nextIndex: bytes.length
        })
    }

    const expectToParsePartially = (toString: PrimitiveMeta<string>['toValue'], str: string) => {
        for (let i = 0; i < str.length; i++) {
            const chunks = [encoder.encode(str.substring(0, i)), encoder.encode(str.substring(i))].reverse()
            const fullLength = chunks.reduce((acc, arr) => acc + arr.length, 0)

            const metaMock: any = {}

            let ch
            let nextIndex = 0
            let value: ReadResult<string> = {} as any

            const stack = new Stack<any>()

            while ((ch = chunks.pop()) !== undefined) {
                const reader: JsonReader = {
                    bytes: ch,
                    writable: chunks.length > 0
                }

                const ctx: ParseContext = {
                    reader: reader,
                    options: defaultOptions,
                    stack: stack,
                }

                value = toString(metaMock, ctx, nextIndex, 0)
                if (isComplete(value)) {
                    break
                }

                if (isNeedsMoreData(value)) {
                    nextIndex = value.nextIndex
                    continue
                }
            }

            expect(value).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: str.substring(1, str.length - 1),
                nextIndex: fullLength
            })
        }
    }

    describe('utf16 string parser', () => {
        jsonTestStrings()
            .forEach(str => {
                test(str.substring(0, 32), () => {
                    const { toString } = createStringParser({
                        ...defaultParseOptions,
                        useUtf16: true
                    })
                    expectToParse(toString, str)
                })
            })
    })

    describe('utf8 string parser', () => {
        jsonTestStrings()
            .forEach(str => {
                test(str.substring(0, 32), () => {
                    const { toString } = createStringParser({
                        ...defaultParseOptions,
                        useUtf16: false
                    })
                    expectToParse(toString, str)
                })
            })
    })

    describe('restrict memory string parser', () => {
        jsonTestStrings()
            .forEach(str => {
                test(str.substring(0, 32), () => {
                    const { toString } = createStringParser({
                        ...defaultParseOptions,
                        maxWasmMemoryPages: 1
                    })
                    expectToParse(toString, str)
                })
            })
    })

    describe('wasmless string parser', () => {
        jsonTestStrings()
            .forEach(str => {
                test(str.substring(0, 32), () => {
                    const { toString } = createStringParser({
                        ...defaultParseOptions,
                        wasmInstance: (b, m) => undefined
                    })
                    expectToParse(toString, str)
                })
            })
    })

    describe('partial strings parser', () => {
        describe('utf16 string parser', () => {
            jsonTestStrings()
                .forEach(str => {
                    test(str.substring(0, 32), () => {
                        const { toString } = createStringParser({
                            ...defaultParseOptions,
                            useUtf16: true
                        })
                        expectToParsePartially(toString, str)
                    })
                })
        })

        describe('utf8 string parser', () => {
            jsonTestStrings()
                .forEach(str => {
                    test(str.substring(0, 32), () => {
                        const { toString } = createStringParser({
                            ...defaultParseOptions,
                            useUtf16: false
                        })
                        expectToParsePartially(toString, str)
                    })
                })
        })

        describe('restrict memory string parser', () => {
            jsonTestStrings()
                .forEach(str => {
                    test(str.substring(0, 32), () => {
                        const { toString } = createStringParser({
                            ...defaultParseOptions,
                            maxWasmMemoryPages: 1
                        })
                        expectToParsePartially(toString, str)
                    })
                })
        })

        describe('wasmless string parser', () => {
            jsonTestStrings()
                .forEach(str => {
                    test(str.substring(0, 32), () => {
                        const { toString } = createStringParser({
                            ...defaultParseOptions,
                            wasmInstance: (b, m) => undefined
                        })
                        expectToParsePartially(toString, str)
                    })
                })
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
        `"${"This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐".repeat(1000)}"`
    ]
}
