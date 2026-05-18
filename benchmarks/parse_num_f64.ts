import { Bench } from 'tinybench'
import { parseNumberF64 } from '../src/converters/number'

const suite = new Bench({ name: 'object_creation', warmupIterations: 200 })

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const integerFastpath = encoder.encode("12345465344565")
const floatFastpath = encoder.encode("1234546.5344565")
const integerMidpath = encoder.encode("9007199254740992")
const floatMidpath = encoder.encode("90071992.54740992")
const integerSlowpath = encoder.encode("1123456789123456789123456789")
const floatSlowPathNum = encoder.encode("1.123456789123456789123456789")

suite
    .add('integerFastpath', () => parseNumberF64(integerFastpath, 0))
    .add('integerFastpathDecoder', () => Number(decoder.decode(integerFastpath)))
    .add('floatFastpath', () => parseNumberF64(floatFastpath, 0))
    .add('floatFastpathDecoder', () => Number(decoder.decode(floatFastpath)))
    .add('integerMidpath', () => parseNumberF64(integerMidpath, 0))
    .add('integerMidpathDecoder', () => Number(decoder.decode(integerMidpath)))
    .add('floatMidpath', () => parseNumberF64(floatMidpath, 0))
    .add('floatMidpathDecoder', () => Number(decoder.decode(floatMidpath)))
    .add('integerSlowpath', () => parseNumberF64(integerSlowpath, 0))
    .add('integerSlowpathDecoder', () => Number(decoder.decode(integerSlowpath)))
    .add('floatSlowpath', () => parseNumberF64(floatSlowPathNum, 0))
    .add('floatSlowpathDecoder', () => Number(decoder.decode(floatSlowPathNum)))

suite.run().then(() => {
    console.log(suite.name)
    console.table(suite.table())
})
