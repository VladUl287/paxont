import { tryParseString } from "../../src/converters/string"
import { JsonReader } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"

describe('tryParseString', () => {
    const encoder = new TextEncoder()

    describe('different strings', () => {
        utf8TestStrings()
            .forEach(str => {
                test(str, () => {
                    const bytes = encoder.encode(str)

                    const reader: JsonReader = {
                        bytes: bytes,
                        writable: false,
                        options: defaultOptions
                    }

                    const metaMock: any = {}

                    const { value, nextIndex } = tryParseString(reader, metaMock, 0, 0, {})

                    expect(value).not.toBeUndefined()
                    expect(value).toBe(str)
                    expect(nextIndex).toBe(bytes.length)
                })
            })
    })

    describe('partial strings', () => { })

    describe('long strings', () => { })
})

function utf8TestStrings() {
    return [
        // Basic ASCII (1-byte sequences)
        "Hello World",
        "1234567890",
        "!@#$%^&*()",
        "The quick brown fox jumps over the lazy dog",

        // (2-byte sequences)
        "Café",
        "résumé",
        "naïve",
        "Noël",
        "façade",
        "über",
        "Müller",
        "São Paulo",
        "Ångström",
        "Æsop",
        "Česká republika",
        "Polska",
        "Россия",
        "Ελλάδα",
        "България",
        "العربية", // Arabic
        "עברית", // Hebrew
        "فارسی", // Persian

        // Asian characters (3-byte sequences)
        "你好世界", // Chinese
        "こんにちは", // Japanese
        "안녕하세요", // Korean
        "汉语", // Chinese
        "日本語", // Japanese

        // Mathematical and technical symbols (3-byte sequences)
        "∑∏∫∂√∞",
        "∀∃∄∈∉",
        "αβγδεζηθ",
        "≈≠≤≥±÷×",

        // Emoji and special symbols (4-byte sequences)
        "😀😁😂🤣😃😄😅😆",
        "❤️🧡💛💚💙💜",
        "⭐🌟✨⚡🔥",
        "🌍🌎🌏🌐",
        "🎉🎊🎈🎁",
        "👍👎👊✊🤛🤜",
        "🚀🛸🌙☀️",
        "💻📱⌨️🖥️",

        // Punctuation and spaces
        "—–…",
        "«»„“”",
        " ", // Non-breaking space
        "　", // Ideographic space

        // Control characters (should be handled carefully)
        "\u0000", // NULL
        "\u0007", // BELL
        "\u001B", // ESC
        "\u007F", // DELETE

        // Invalid/edge cases (for testing error handling)
        "\uD800", // Surrogate half (invalid in UTF-8)
        "\uDFFF", // Surrogate half (invalid in UTF-8)
        "\uFFFE", // Non-character
        "\uFFFF", // Non-character

        // Mixed scripts
        "English 中文 日本語 한국어 العربية",
        "Hello 世界 🌍",
        "Café au lait ☕",

        // Long strings
        "This is a longer string with multiple characters: 你好世界 こんにちは 안녕하세요 🌟✨⭐",
        "Testing various special characters: ∑∏∫∂√∞ ≈≠≤≥±÷× ∀∃∄∈∉ αβγδεζηθ",

        // Strings with combining characters
        "e\u0301", // é (e + combining acute accent)
        "n\u0303", // ñ (n + combining tilde)
        "a\u0308", // ä (a + combining diaeresis)
        "u\u0302", // û (u + combining circumflex)

        // Zero-width characters
        "\u200B", // Zero-width space
        "\u200C", // Zero-width non-joiner
        "\u200D", // Zero-width joiner
        "\uFEFF", // Byte order mark

        // Musical symbols (3-byte sequences)
        "♩♪♫♬",

        // Currency symbols
        "$€£¥₣₤₧₨₩₪₫₭₮₯",

        // Arrow symbols
        "←↑→↓↔↕↖↗↘↙",

        // Box drawing characters
        "─│┌┐└┘├┤┬┴┼",

        // Edge case: Maximum 4-byte sequence (valid Unicode)
        "\u{10FFFF}", // Maximum valid Unicode code point

        // Edge case: Minimum 4-byte sequence
        "\u{10000}", // First valid 4-byte sequence

        // Zero-length string
        "",

        // Whitespace variations
        "   ", // Spaces
        "\t", // Tab
        "\n", // Newline
        "\r\n", // CRLF

        // Mixed case and accents
        "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ",
        "àáâãäåæçèéêëìíîï",

        // Nordic characters
        "ÅÄÖåäö",
        "ÆØÅæøå",

        // Baltic characters
        "ĄČĘĖĮŠŲŪŽąčęėįšųūž",

        // Turkish characters
        "ĞİŞÖÜğışöüç",

        // Vietnamese characters
        "ĂÂĐÊÔƠƯăâđêôơư",
        "àáảãạăắằẳẵặâấầẩẫậ",

        // Thai characters
        "สวัสดี", // Hello in Thai

        // Hindi/Devanagari
        "नमस्ते", // Hello in Hindi

        // Tibetan
        "༄༅༆༇༈",

        // Runes
        "ᚠᚢᚦᚨᚩ",

        // Cherokee
        "ᎠᎡᎢᎣᎤ"
    ]
}
