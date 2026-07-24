export function generateTrie(values: Uint8Array[]) {
    type Value = {
        readonly bytes: Uint8Array,
        readonly index: number
    }

    const build = (values: Array<Value>, depth = 0) => {
        const d = depth
        const count = values.length

        if (count === 0) return 'return -1;'
        if (count === 1 && d >= values[0].bytes.length) {
            return `return ${values[0].index};`
        }

        if (count === 1) {
            const { bytes: b, index } = values[0]

            const chunks = new Array<string>()

            let i = d
            while (i < b.length - 4) {
                const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

                const packValue = a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24
                chunks.push(`((a[i+${i}] | a[i+${i + 1}]<<8 | a[i+${i + 2}]<<16 | a[i+${i + 3}]<<24) === ${packValue})`)

                i += 4
            }

            while (i < b.length) {
                chunks.push(`a[i+${i}]===${b[i]}`)
                i++
            }

            return 'return (' + chunks.join(' && ') + `) ? ${index} : -1`
        }

        const canPack4 = values.every(c => (c.bytes.length - d) >= 4)
        const canPack3 = values.every(c => (c.bytes.length - d) >= 3)

        const map = new Map<number, Value[]>()
        if (canPack4) {
            for (let i = 0; i < values.length; i++) {
                const value = values[i]
                const b = value.bytes

                if (d + 3 < b.length) {
                    const packed = b[d] | b[d + 1] << 8 | b[d + 2] << 16 | b[d + 3] << 24
                    const array = map.get(packed) ?? new Array<Value>()
                    if (!map.has(packed))
                        map.set(packed, array)
                    array.push(value)
                    continue
                }

                if (d < b.length) {
                    const byte = b[d]
                    const array = map.get(byte) ?? new Array<Value>()
                    if (!map.has(byte))
                        map.set(byte, array)
                    array.push(value)
                }
            }

            let switchTrie = `switch(a[i+${d}] | a[i+${d + 1}]<<8 | a[i+${d + 2}]<<16 | a[i+${d + 3}]<<24){`;
            for (const [key, values] of map) {
                switchTrie += `case ${key}:{${build(values, d + 4)}}`
            }
            return switchTrie + 'default: return -1;}'
        }
        else if (canPack3) {
            for (let i = 0; i < values.length; i++) {
                const byte = values[i]
                const b = byte.bytes

                if (d + 2 < b.length) {
                    const packed = b[d] | b[d + 1] << 8 | b[d + 2] << 16
                    const array = map.get(packed) ?? new Array<Value>()
                    if (!map.has(packed))
                        map.set(packed, array)
                    array.push(byte)
                    continue
                }

                if (d < b.length) {
                    const value = b[d]
                    const array = map.get(value) ?? new Array<Value>()
                    if (!map.has(value))
                        map.set(value, array)
                    array.push(byte)
                }
            }

            let switchCode = `switch(a[i+${d}] | a[i+${d + 1}] << 8 | a[i+${d + 2}] << 16) {`
            for (const [packed, values] of map) {
                switchCode += `case ${packed}:{${build(values, d + 4)}}`
            }
            return switchCode + 'default: return -1;}'
        }
        else {
            let defaultIndex: number = -1

            for (let i = 0; i < values.length; i++) {
                const value = values[i]
                const b = value.bytes

                if (d < b.length) {
                    const byte = b[d]
                    const array = map.get(byte) ?? new Array<Value>()
                    if (!map.has(byte))
                        map.set(byte, array)
                    array.push(value)
                    continue
                }

                defaultIndex = value.index
            }

            let switchCode = `switch(a[i+${d}]){`;
            for (const [key, values] of map) {
                switchCode += `case ${key}:{${build(values, d + 1)}}`
            }
            return switchCode + `default: return ${defaultIndex};}`
        }
    }

    const mappedValues = values.map((b, i) => ({ 
        bytes: b,
        index: i
    }))
    return new Function('a', 'i', `${build(mappedValues, 0)}return -1;`)
}
