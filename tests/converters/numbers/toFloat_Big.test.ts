import fs from 'fs'
import { JsonParsingContext } from '../../../src/metadata/types'
import { defaultOptions } from '../../../src/options'
import { Stack } from '../../../src/utils/stack'
import { JsonReader } from '../../../src/utils/reader'
import { float64 } from '../../../src/converters/toValue/number/floatFormats'
import { tryParseFloat } from '../../../src/converters/toValue/number/float'
import { ReadResultType } from '../../../src/utils/result'
import { toBytes } from '../utils'

describe('parseNumberF64-files', () => {
    const toContext = (str: string): JsonParsingContext => {
        const bytes = toBytes(str)
        const reader = new JsonReader(bytes, bytes.length, false)
        return new JsonParsingContext(reader, defaultOptions, new Stack())
    }

    const files = fs.readdirSync('./tests/data/double')
        .filter(file => file.endsWith('.txt'))

        files.forEach(file => {
        test(file, () => {
            const fileContent = fs.readFileSync('./tests/data/double/' + file)
            const text = new TextDecoder().decode(fileContent)

            const numbers = text.split('\n').map(l => {
                const line = l.split(' ')
                return line[line.length - 1]
            })

            numbers.forEach(num => {
                const reader = toContext(num)
                const parsed = tryParseFloat(reader, float64) as any

                parsed.value = `${num} -> ${parsed.value}`
                expect(parsed).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: `${num} -> ${Number(num)}`,
                    nextIndex: reader.reader.bytes.length
                })
            })
        })
    })
})
