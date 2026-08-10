import fs from 'fs'
import { ParseContext } from '../../../src/metadata/types'
import { tryParseFloat } from '../../../src/converters/number/float'
import { ReadResultType } from '../../../src/utils/types'
import { float64 } from "../../../src/converters/number/floatFormats"
import { defaultOptions } from '../../../src/options'
import { Stack } from '../../../src/utils/stack'

describe('parseNumberF64-files', () => {
    const encoder = new TextEncoder()
    const toContext = (str: string): ParseContext => {
        return { options: defaultOptions, reader: ({ bytes: encoder.encode(str), writable: false }), stack: new Stack() }
    }

    const files = fs.readdirSync('./tests/data')
        .filter(file => file.endsWith('.txt'))

    test.concurrent.each(files)('%s', (file) => {
        const fileContent = fs.readFileSync('./tests/data/' + file)
        const text = new TextDecoder().decode(fileContent)

        const numbers = text.split('\n')
            .filter(c => c.length > 0)
            .map(l => {
                const line = l.split(' ')
                return line[line.length - 1]
            })

        numbers.forEach(num => {
            const ctx = toContext(num)
            const parsed = tryParseFloat(ctx, 0, float64) as any

            parsed.value = `${num} -> ${parsed.value}`
            expect(parsed).toStrictEqual({
                type: ReadResultType.COMPLETE,
                value: `${num} -> ${Number(num)}`,
                nextIndex: ctx.reader.bytes.length
            })
        })
    })

    // const files = ['ulfjack-ryu.txt']

    // files.forEach(file => {
    //     test(file, () => {
    //         const fileContent = fs.readFileSync('./tests/data/' + file)
    //         const text = new TextDecoder().decode(fileContent)

    //         const numbers = text.split('\n').map(l => {
    //             const line = l.split(' ')
    //             return line[line.length - 1]
    //         })

    //         numbers.forEach(num => {
    //             const reader = toContext(num)
    //             const parsed = tryParseFloat(reader, 0, float64) as any

    //             parsed.value = `${num} -> ${parsed.value}`
    //             expect(parsed).toStrictEqual({
    //                 type: ReadResultType.COMPLETE,
    //                 value: `${num} -> ${Number(num)}`,
    //                 nextIndex: reader.reader.bytes.length
    //             })
    //         })
    //     })
    // })
})
