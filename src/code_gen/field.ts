export type MatchOptions = {
    pack: boolean
}

//TODO: use pack only for 0-255 values due to collisions possibility
//TODO: split small fields and big fields on differents switches in case if all values in range 0-255
//TODO: add pack with 3 and 2 symbols also
//TODO: use one (default: return -1) value if applyable
export function generateSwitchMatcherPack(fields: Uint8Array[], options: MatchOptions) {
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

        if (options.pack && arrays.length === 1) {
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

    // console.log(functionBody)

    return new Function('arr', 'i', functionBody);
}

export function generateSwitchMatcher(predefinedArrays: Uint8Array[], options: MatchOptions) {
    const buildSwitchTree = (arrays: Uint8Array[], indices: number[], depth = 0) => {
        const maxDepth = Math.max(...arrays.map(arr => arr.length));

        if (arrays.length === 0) return 'return -1;';

        if (arrays.length === 1 && depth >= arrays[0].length) {
            return `return ${indices[0]};`;
        }

        if (depth >= maxDepth) {
            if (arrays.length === 1) {
                return `return ${indices[0]};`;
            }
            return 'return -1;';
        }

        if (options.pack && arrays.length === 1) {
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

        const valueMap = new Map();
        let defaultValue: number = -1

        for (let i = 0; i < arrays.length; i++) {
            const arr = arrays[i];
            const idx = indices[i];

            if (depth < arr.length) {
                const val = arr[depth];
                if (!valueMap.has(val)) valueMap.set(val, { arrays: [], indices: [] });
                valueMap.get(val).arrays.push(arr);
                valueMap.get(val).indices.push(idx);
            }
            else {
                defaultValue = idx
            }
        }

        let switchCode = `switch(arr[i+${depth}]) {\n`;

        for (const [val, { arrays: matchingArrays, indices: matchingIndices }] of valueMap) {
            switchCode += `    case ${val}: {\n`;
            const nested = buildSwitchTree(matchingArrays, matchingIndices, depth + 1);
            switchCode += `        ${nested}\n`;
            switchCode += `    }\n`;
        }

        switchCode += `    default: return ${defaultValue};\n`;
        switchCode += `}\n`;

        return switchCode;
    };

    const indices = predefinedArrays.map((_, i) => i);

    const functionBody = `
        ${buildSwitchTree(predefinedArrays, indices, 0)}
        return -1;
    `;

    return new Function('arr', 'i', functionBody);
}

export function generateSwitchMatcherLength(predefinedArrays: Uint8Array[]) {
    const byLength = new Map();
    for (let i = 0; i < predefinedArrays.length; i++) {
        const arr = predefinedArrays[i];
        const len = arr.length;
        if (!byLength.has(len)) byLength.set(len, []);
        byLength.get(len).push({ index: i, array: arr });
    }

    const buildOptimizedSwitch = (items: { index: number, array: Uint8Array }[], depth: number, indent = '') => {
        if (items.length === 0) return `${indent}return -1;`;
        if (items.length === 1) {
            return `${indent}return ${items[0].index};`;
        }

        const valueMap = new Map();
        let isSequential = true;
        let prevVal = null;

        for (const item of items) {
            if (depth < item.array.length) {
                const val = item.array[depth];
                if (!valueMap.has(val)) valueMap.set(val, []);
                valueMap.get(val).push(item);

                if (prevVal !== null && val !== prevVal + 1) {
                    isSequential = false;
                }
                prevVal = val;
            }
        }

        const values = Array.from(valueMap.keys()).sort((a, b) => a - b);

        if (isSequential && values.length > 3 && values[values.length - 1] - values[0] === values.length - 1) {
            let code = `${indent}const val = arr[i+${depth}];\n`;
            code += `${indent}if (val >= ${values[0]} && val <= ${values[values.length - 1]}) {\n`;
            code += `${indent}    switch(val) {\n`;
            for (const val of values) {
                code += `${indent}        case ${val}: {\n`;
                code += buildOptimizedSwitch(valueMap.get(val), depth + 1, indent + '            ');
                code += `\n${indent}        }\n`;
            }
            code += `${indent}        default: return -1;\n`;
            code += `${indent}    }\n`;
            code += `${indent}}\n`;
            code += `${indent}return -1;`;
            return code;
        }

        let code = `${indent}switch(arr[i+${depth}]) {\n`;

        for (const val of values) {
            code += `${indent}    case ${val}: {\n`;
            code += buildOptimizedSwitch(valueMap.get(val), depth + 1, indent + '        ');
            code += `\n${indent}    }\n`;
        }

        code += `${indent}    default: return -1;\n`;
        code += `${indent}}`;

        return code;
    };

    const functionBody = `        
        switch(arr.length) {
            ${Array.from(byLength.keys()).map(length => `
                case ${length}: {
                    ${buildOptimizedSwitch(byLength.get(length), 0, '                    ')}
                }
            `).join('')}
            default: return -1;
        }
    `

    return new Function('arr', 'i', functionBody);
}
