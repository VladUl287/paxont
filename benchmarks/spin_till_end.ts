import { add, complete, cycle, suite } from 'benny'
import * as JsonCodes from '../src/utils/utf8constants'

const bytes = new TextEncoder().encode("343543534}")

const stopLookup = new Uint8Array(256)
stopLookup[JsonCodes.COMMA] = 1
stopLookup[JsonCodes.CURLY_CLOSE] = 1

suite(
    'spin_till_end',

    add('loop', () => {
        let j = 0
        while (j < bytes.length && bytes[j] !== JsonCodes.CURLY_CLOSE && bytes[j] !== JsonCodes.COMMA)
            j++
        return j
    }),
    add('loop_lookup', () => {
        let j = 0
        while (j < bytes.length && !stopLookup[bytes[j]])
            j++
        return j
    }),
    add('loop_unfold', () => {
        let j = 0
        while (j + 4 < bytes.length) {
            const a = bytes[j]
            const b = bytes[j + 1]
            const c = bytes[j + 2]
            const d = bytes[j + 3]

            if (a === JsonCodes.CURLY_CLOSE || a === JsonCodes.COMMA || b === JsonCodes.CURLY_CLOSE ||
                b === JsonCodes.COMMA || c === JsonCodes.CURLY_CLOSE || c === JsonCodes.COMMA ||
                d === JsonCodes.CURLY_CLOSE || d === JsonCodes.COMMA
            ) {
                break
            }

            j += 4
        }
        while (j < bytes.length && bytes[j] !== JsonCodes.CURLY_CLOSE && bytes[j] !== JsonCodes.COMMA)
            j++
        return j
    }),
    add('loop_unfold_lookup', () => {
        let j = 0
        while (j + 4 < bytes.length) {
            const a = bytes[j]
            const b = bytes[j + 1]
            const c = bytes[j + 2]
            const d = bytes[j + 3]

            if (stopLookup[a] || stopLookup[b] || stopLookup[c] || stopLookup[d])
                break

            j += 4
        }
        while (j < bytes.length && bytes[j] !== JsonCodes.CURLY_CLOSE && bytes[j] !== JsonCodes.COMMA)
            j++
        return j
    }),

    cycle(),
    complete(),
)
