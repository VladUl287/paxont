import { add, complete, cycle, suite } from 'benny'
import { JsonReader, ParseState } from '../../src/metadata/types'
import { defaultOptions } from '../../src/options'
import { createStringParser, defaultParseOptions, toString } from '../../src/converters/string'
import { Stack } from '../../src/utils/stack'
import { genUnrolledFromCharCode, genUnrolledFromCharCode16 } from '../../src/code_gen/string'

const utf8TestStrings = [
    //ascii only
    '""',
    '"a"',
    '"success"',
    '"Lorem Ipsum is simply."',
    '"Lorem Ipsum is simply dummy text of the printing and typesetting industry."',
    `"${'Lorem Ipsum is simply dummy text of the printing and typesetting industry. '.repeat(500)}"`,
    `"${'Lorem Ipsum is simply dummy text of the printing and typesetting industry. '.repeat(5000)}"`,

    //2‑byte characters (Latin‑1 Supplement, Greek, Cyrillic)
    '"é"',
    '"èêë"',
    '"café"',
    '"naïve"',
    '"résumé"',
    '"π≈≠"',
    '"Рыбатекст"',
    '"Καλημέρα"',
    '"Рыбатекст это универсальный текст-заполнитель, который широко используется в сферах графического дизайна."',
    `"${'Рыбатекст это универсальный текст-заполнитель, который широко используется в сферах графического дизайна. '.repeat(500)}"`,
    `"${'Рыбатекст это универсальный текст-заполнитель, который широко используется в сферах графического дизайна. '.repeat(5000)}"`,

    //3‑byte characters (CJK, Devanagari, Arabic, etc.)
    '"€"',
    '"€£¥"',
    '"你"',
    '"你好"',
    '"你好世界"',
    '"こんにちは"',
    '"안녕하세요"',
    '"मनुष्य"',
    '"العربية"',
    '"〰〽〿"',
    '"夫天地者，万物之逆旅也；光阴者，百代之过客也。而浮生若梦，为欢几何？"',
    `"${'夫天地者，万物之逆旅也；光阴者，百代之过客也。而浮生若梦，为欢几何？'.repeat(500)}"`,
    `"${'夫天地者，万物之逆旅也；光阴者，百代之过客也。而浮生若梦，为欢几何？'.repeat(5000)}"`,

    // 4‑byte characters (Emoji, rare scripts, musical symbols)
    '"😀"',
    '"😀😁"',
    '"🔥❤️💯"',
    '"🌍🌎🌏"',
    '"𐍈"',
    '"𝄞𝄟"',
    '"🧑‍💻"',
    '"🇺🇸🇬🇧"',
    '"😀 😀😁 🔥❤️💯 🌍🌎🌏 𐍈 𝄞𝄟 🧑‍💻 🇺🇸🇬🇧"',
    `"${'😀 😀😁 🔥❤️💯 🌍🌎🌏 𐍈 𝄞𝄟 🧑‍💻 🇺🇸🇬🇧'.repeat(500)}"`,
    `"${'😀 😀😁 🔥❤️💯 🌍🌎🌏 𐍈 𝄞𝄟 🧑‍💻 🇺🇸🇬🇧'.repeat(5000)}"`,

    // mixed
    '"aé€😀"',
    '"Hello 世界"',
    '"café ☕ こんにちは"',
    '"π = 3.14 🔥"',
    '"a𐍈b😀c€d"',
    '"123é€😀你好"',
    '"English and 中文 and 日本語 and 한국어"',
    '"Price: 10€, discount 20% 🔥"',
    '"Привет, мир! 🌍 Hello, world!"',
    '"𐍈𐌰𐌹𐌻𐌰 𐍃𐌰𐌹𐍅𐌰𐌻𐌰"',
    '"aé€😀 Hello 世界 café ☕ こんにちは π = 3.14 🔥 a𐍈b😀c€d 123é€😀你好 English and 中文 and 日本語 and 한국어 Price: 10€, discount 20% 🔥 Привет, мир! 🌍 Hello, world! 𐍈𐌰𐌹𐌻𐌰 𐍃𐌰𐌹𐍅𐌰𐌻𐌰 "',
    `"${'aé€😀 Hello 世界 café ☕ こんにちは π = 3.14 🔥 a𐍈b😀c€d 123é€😀你好 English and 中文 and 日本語 and 한국어 Price: 10€, discount 20% 🔥 Привет, мир! 🌍 Hello, world! 𐍈𐌰𐌹𐌻𐌰 𐍃𐌰𐌹𐍅𐌰𐌻𐌰 '.repeat(500)}"`,
    `"${'aé€😀 Hello 世界 café ☕ こんにちは π = 3.14 🔥 a𐍈b😀c€d 123é€😀你好 English and 中文 and 日本語 and 한국어 Price: 10€, discount 20% 🔥 Привет, мир! 🌍 Hello, world! 𐍈𐌰𐌹𐌻𐌰 𐍃𐌰𐌹𐍅𐌰𐌻𐌰 '.repeat(5000)}"`,
]

const metaMock = {} as any

const encoder = new TextEncoder()
const cases = utf8TestStrings.reduce((acc, str) => {
    const bytes = encoder.encode(str)

    const data: JsonReader = {
        bytes: bytes,
        writable: false
    }

    const ctx = {
        reader: data,
        options: defaultOptions,
        stack: new Stack<ParseState>()
    }

    const factories = new Array<(data: ArrayLike<number>, i: number) => string>(32)
    factories[0] = (_a, _i) => ""
    const factories16 = new Array<(data: ArrayLike<number>, i: number) => string>(32)
    factories16[0] = (_a, _i) => ""

    const toStringBrowser = createStringParser({
        ...defaultParseOptions,
        newUtf16: (bytes: Uint8Array) => {
            const unsafeDecoder16 = new TextDecoder('utf-16le', { fatal: false })
            return (start, end) => {
                const length = end - start
                if (length <= 64) {
                    const factory = (factories[length / 2] ??= genUnrolledFromCharCode16(length))
                    return factory(bytes, start)
                }
                return unsafeDecoder16.decode(new Uint8Array(bytes.buffer, start, end - start))
            }
        },

        newUtf8: (bytes: Uint8Array) => {
            const unsafeDecoder8 = new TextDecoder('utf-8', { fatal: false })
            return (start, end, ascii_only = false) => {
                const length = end - start
                if (ascii_only && length <= 32) {
                    const factory = (factories[length] ??= genUnrolledFromCharCode(length))
                    return factory(bytes, start)
                }
                return unsafeDecoder8.decode(new Uint8Array(bytes.buffer, start, end - start))
            }
        }
    }).toString

    acc.push(add(`${str.substring(0, 10)}(${str.length})`, () => toString(metaMock, ctx, 0, 0)))
    acc.push(add(`Browser ${str.substring(0, 10)}(${str.length})`, () => toStringBrowser(metaMock, ctx, 0, 0)))
    acc.push(add(`JSON.parse(${str.substring(0, 10)}(${str.length}))`, () => JSON.parse(str)))
    return acc
}, new Array<any>())

suite(
    'decoding',

    ...cases,

    cycle((result) => {
        const nanoseconds = (1 / result.ops) * 1e9
        console.log(
            `${result.name}: ` +
            `${result.ops.toLocaleString()} ops/s, ` +
            `${nanoseconds.toFixed(2)} ns/op`
        )
    }),

    complete(),
)
