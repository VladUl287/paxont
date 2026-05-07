import { parseNumberF64 } from "../src/converters/number"
import fs, { read } from 'fs'
import readline from 'readline'

describe('parseNumberF64-files', () => {
    const encoder = new TextEncoder()
    const toBytes = (str: string): Uint8Array => encoder.encode(str)

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
                const bytes = toBytes(num)
                const parsed = parseNumberF64(bytes, 0) as any
                parsed.value = `${num} -> ${parsed.value}`
                expect(parsed).toStrictEqual({ value: `${num} -> ${Number(num)}`, nextIndex: bytes.length })
            })
        })
    })
})
