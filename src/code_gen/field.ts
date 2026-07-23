export function generateTrieSwitch(fields: Uint8Array[]) {
    const buildSwitchTree = (arrays: Uint8Array[], indices: number[], depth = 0) => {
        const maxDepth = Math.max(...arrays.map(arr => arr.length));

        if (arrays.length === 0) return 'return -1;'

        if (arrays.length === 1 && depth >= arrays[0].length) {
            return `return ${indices[0]};`
        }

        if (depth >= maxDepth) {
            if (arrays.length === 1) {
                return `return ${indices[0]};`
            }
            return 'return -1;'
        }

        if (arrays.length === 1) {
            let chunks = []

            let bytes = arrays[0]
            let i = depth
            for (; i < bytes.length - 4; i += 4) {
                const a = bytes[i]
                const b = bytes[i + 1]
                const c = bytes[i + 2]
                const d = bytes[i + 3]

                const packValue = a << 0 | b << 8 | c << 16 | d << 24

                chunks.push(`((arr[i+${i}]<<0 | arr[i+${i + 1}]<<8 | arr[i+${i + 2}]<<16 | arr[i+${i + 3}]<<24) === ${packValue})`)
            }

            chunks.push(
                '(' + [...bytes]
                    .slice(i)
                    .map((v, j) => `arr[i+${i + j}]===${v}`)
                    .join(' && ') + ')'
            )

            return 'return (' + chunks.join(' && ') + `) ? ${indices[0]} : -1`
        }

        const canPack4 = arrays.every(c => (c.length - depth) >= 4)
        const canPack3 = arrays.every(c => (c.length - depth) >= 3)

        if (canPack4) {
            const packedMap = new Map()

            for (let i = 0; i < arrays.length; i++) {
                const arr = arrays[i]
                const idx = indices[i]

                if (depth + 3 < arr.length) {
                    const packed = (arr[depth] << 0) |
                        (arr[depth + 1] << 8) |
                        (arr[depth + 2] << 16) |
                        (arr[depth + 3] << 24);

                    if (!packedMap.has(packed)) packedMap.set(packed, { arrays: [], indices: [] });
                    packedMap.get(packed).arrays.push(arr);
                    packedMap.get(packed).indices.push(idx);
                } else if (depth < arr.length) {
                    const val = arr[depth];
                    if (!packedMap.has(val)) packedMap.set(val, { arrays: [], indices: [] });
                    packedMap.get(val).arrays.push(arr);
                    packedMap.get(val).indices.push(idx);
                }
            }

            let switchCode = `switch((arr[i+${depth}] << 0 | arr[i+${depth + 1}] << 8 | arr[i+${depth + 2}] << 16 | arr[i+${depth + 3}] << 24) >>> 0) {\n`;

            for (const [packed, { arrays: matchingArrays, indices: matchingIndices }] of packedMap) {
                switchCode += `    case ${packed}: {\n`;
                const nested = buildSwitchTree(matchingArrays, matchingIndices, depth + 4)
                switchCode += `        ${nested}\n`
                switchCode += `    }\n`
            }

            switchCode += `    default: return -1;\n`
            switchCode += `}\n`
            return switchCode
        }
        else if (canPack3) {
            const packedMap = new Map()

            for (let i = 0; i < arrays.length; i++) {
                const arr = arrays[i]
                const idx = indices[i]

                if (depth + 2 < arr.length) {
                    const packed = (arr[depth] << 0) | (arr[depth + 1] << 8) | (arr[depth + 2] << 16)

                    if (!packedMap.has(packed)) packedMap.set(packed, { arrays: [], indices: [] })
                    packedMap.get(packed).arrays.push(arr)
                    packedMap.get(packed).indices.push(idx)
                }
                else if (depth < arr.length) {
                    const val = arr[depth]
                    if (!packedMap.has(val)) packedMap.set(val, { arrays: [], indices: [] })
                    packedMap.get(val).arrays.push(arr)
                    packedMap.get(val).indices.push(idx)
                }
            }

            let switchCode = `switch((arr[i+${depth}] << 0 | arr[i+${depth + 1}] << 8 | arr[i+${depth + 2}] << 16) >>> 0) {\n`

            for (const [packed, { arrays: matchingArrays, indices: matchingIndices }] of packedMap) {
                switchCode += `    case ${packed}: {\n`;
                const nested = buildSwitchTree(matchingArrays, matchingIndices, depth + 4)
                switchCode += `        ${nested}\n`
                switchCode += `    }\n`
            }

            switchCode += `    default: return -1;\n`
            switchCode += `}\n`
            return switchCode
        }
        else {
            const valueMap = new Map()
            let defaultValue: number = -1

            for (let i = 0; i < arrays.length; i++) {
                const arr = arrays[i];
                const idx = indices[i];

                if (depth < arr.length) {
                    const val = arr[depth]
                    if (!valueMap.has(val)) valueMap.set(val, { arrays: [], indices: [] })
                    valueMap.get(val).arrays.push(arr)
                    valueMap.get(val).indices.push(idx)
                }
                else {
                    defaultValue = idx
                }
            }

            let switchCode = `switch(arr[i+${depth}]) {\n`;

            for (const [val, { arrays: matchingArrays, indices: matchingIndices }] of valueMap) {
                switchCode += `    case ${val}: {\n`;
                const nested = buildSwitchTree(matchingArrays, matchingIndices, depth + 1)
                switchCode += `        ${nested}\n`;
                switchCode += `    }\n`;
            }

            switchCode += `    default: return ${defaultValue};\n`;
            switchCode += `}\n`;

            return switchCode;
        }
    };

    const indices = fields.map((_, i) => i);

    const functionBody = `
        ${buildSwitchTree(fields, indices, 0)}
        return -1;
    `

    return new Function('arr', 'i', functionBody)
}
