import fs from 'fs'
import { JsonReader } from '../../../src/metadata/types'
import { f64Format, tryParseFloat } from '../../../src/converters/number/float'
import { isComplete, ReadResultType } from '../../../src/utils/types'

describe('parseNumberF64-files', () => {
    const encoder = new TextEncoder()
    const toReader = (str: string): JsonReader => ({ bytes: encoder.encode(str), writable: false })

    const files = fs.readdirSync('./tests/data')
        .filter(file => file.endsWith('.txt'))

    files.forEach(file => {
        test(file, () => {
            const fileContent = fs.readFileSync('./tests/data/' + file)
            const text = new TextDecoder().decode(fileContent)

            const numbers = text.split('\n').map(l => {
                const line = l.split(' ')
                return line[line.length - 1]
            })

            numbers.forEach(num => {
                const reader = toReader(num)
                const parsed = tryParseFloat(reader, 0, f64Format) as any

                parsed.value = `${num} -> ${parsed.value}`
                expect(parsed).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: `${num} -> ${Number(num)}`, 
                    nextIndex: reader.bytes.length 
                })
            })
        })
    })
})
