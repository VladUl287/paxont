export function generateTrieSwitch(fields: Uint8Array[]) {
    type Field = {
        readonly bytes: Uint8Array,
        readonly index: number
    }

    const buildSwitchTrie = (fields: Array<Field>, depth = 0) => {
        const fieldsCount = fields.length

        if (fieldsCount === 0) return 'return -1;'
        if (fieldsCount === 1 && depth >= fields[0].bytes.length) {
            return `return ${fields[0].index};`
        }

        // const maxDepth = Math.max(...fields.map(arr => arr.length))
        // if (depth >= maxDepth) {
        //     if (fields.length === 1) {
        //         return `return ${indices[0]};`
        //     }
        //     return 'return -1;'
        // }

        if (fieldsCount === 1) {
            const { bytes: b, index } = fields[0]

            const chunks = new Array<string>(Math.ceil(b.length / 4) + 1)

            let i = depth
            while (i < b.length - 4) {
                const a1 = b[i], a2 = b[i + 1], a3 = b[i + 2], a4 = b[i + 3]

                const packValue = a1 << 0 | a2 << 8 | a3 << 16 | a4 << 24
                chunks.push(`((a[i+${i}]<<0 | a[i+${i + 1}]<<8 | a[i+${i + 2}]<<16 | a[i+${i + 3}]<<24) === ${packValue})`)

                i += 4
            }

            while (i < b.length) {
                chunks.push(`a[i+${i}]===${b[i]}`)
                i++
            }

            return 'return (' + chunks.join(' && ') + `) ? ${index} : -1`
        }

        const canPack4 = fields.every(c => (c.bytes.length - depth) >= 4)
        const canPack3 = fields.every(c => (c.bytes.length - depth) >= 3)

        let d = depth
        if (canPack4) {
            const map = new Map<number, Field[]>()

            for (let i = 0; i < fields.length; i++) {
                const field = fields[i]
                const b = field.bytes

                if (d + 3 < b.length) {
                    const packed = b[d] | b[d + 1] << 8 | b[d + 2] << 16 | b[d + 3] << 24
                    const array = map.get(packed) ?? new Array<Field>()
                    if (!map.has(packed))
                        map.set(packed, array)
                    array.push(field)
                    continue
                }

                if (d < b.length) {
                    const value = b[d]
                    const array = map.get(value) ?? new Array<Field>()
                    if (!map.has(value))
                        map.set(value, array)
                    array.push(field)
                }
            }

            let switchTrie = `switch(a[i+${d}] | a[i+${d + 1}]<<8 | a[i+${d + 2}]<<16 | a[i+${d + 3}]<<24){`;
            for (const [key, fields] of map) {
                switchTrie += `case ${key}:{${buildSwitchTrie(fields, d + 4)}}`
            }
            return switchTrie + 'default: return -1;}'
        }
        else if (canPack3) {
            const map = new Map<number, Field[]>()

            for (let i = 0; i < fields.length; i++) {
                const field = fields[i]
                const b = field.bytes

                if (d + 2 < b.length) {
                    const packed = b[d] | b[d + 1] << 8 | b[d + 2] << 16
                    const array = map.get(packed) ?? new Array<Field>()
                    if (!map.has(packed))
                        map.set(packed, array)
                    array.push(field)
                    continue
                }

                if (d < b.length) {
                    const value = b[d]
                    const array = map.get(value) ?? new Array<Field>()
                    if (!map.has(value))
                        map.set(value, array)
                    array.push(field)
                }
            }

            let switchCode = `switch(a[i+${d}] | a[i+${d + 1}] << 8 | a[i+${d + 2}] << 16) {`
            for (const [packed, fields] of map) {
                switchCode += `case ${packed}:{${buildSwitchTrie(fields, d + 4)}}`
            }
            return switchCode + 'default: return -1;}'
        }
        else {
            const map = new Map()
            let defaultIndex: number = -1

            for (let i = 0; i < fields.length; i++) {
                const field = fields[i]
                const b = field.bytes

                if (d < b.length) {
                    const value = b[d]
                    const array = map.get(value) ?? new Array<Field>()
                    if (!map.has(value))
                        map.set(value, array)
                    array.push(field)
                    continue
                }

                defaultIndex = field.index
            }

            let switchCode = `switch(a[i+${d}]){`;
            for (const [key, fields] of map) {
                switchCode += `case ${key}:{${buildSwitchTrie(fields, d + 1)}}`
            }
            return switchCode + `default: return ${defaultIndex};}`
        }
    }

    const mappedFields = fields.map((b, i) => ({
        bytes: b,
        index: i
    }))
    const functionBody = `${buildSwitchTrie(mappedFields, 0)}return -1;`
    console.log(functionBody)
    return new Function('arr', 'i', functionBody)
}
