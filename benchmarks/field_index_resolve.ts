import { add, complete, cycle, suite } from 'benny'

const encoder = new TextEncoder()

const small_unique_object = {
    "id": 1,
    "name": "Project Alpha",
    "active": true,
    "score": 99.5,
    "code": "ALPHA-001",
    "description": "This is a top-level project description without any nested structures inside.",
    "priority": "high",
    "created_at": "2025-01-15T10:30:00Z",
    "version": 3,
    "is_verified": false,
    "tags_count": 12
}

const mid_duplicates_object = {
    id: 15,
    order: 1244,
    phone: 343543534,
    phone1: 343543534,
    phone2: 343543534,
    phone3: 343543534,
    phone4: 343543534,
    phone5: 343543534,
    phone6: 343543534,
    phone7: 343543534,
    phone8: 343543534,
    phone9: 343543534,
    phone10: 343543534,
    phone11: 343543534,
    phone12: 343543534,
    phone13: 343543534,
}

const big_unique_object = {
    "id": 1,
    "name": "Project Alpha",
    "active": true,
    "score": 99.5,
    "code": "ALPHA-001",
    "description": "This is a top-level project description without any nested structures inside.",
    "priority": "high",
    "created_at": "2025-01-15T10:30:00Z",
    "version": 3,
    "is_verified": false,
    "tags_count": 12,
    "owner_id": 42,
    "region": "EMEA",
    "budget": 250000,
    "currency": "USD",
    "risk_level": 0.75,
    "last_audit": "2025-03-20",
    "requires_approval": true,
    "team_size": 8,
    "repository_url": "https://github.com/example/alpha",
    "docs_version": "2.1.0",
    "license": "MIT",
    "compliance_status": "passed",
    "timezone": "Europe/London",
    "retry_count": 0,
    "max_retries": 5,
    "timeout_seconds": 30,
    "environment": "production",
    "log_level": "info",
    "backup_enabled": false,
    "storage_gb": 512,
    "cpu_cores": 4,
    "memory_mb": 8192,
    "endpoint": "https://api.example.com/v1/alpha",
    "ssl_verified": true,
    "rate_limit_rps": 1000,
    "auth_method": "oauth2",
    "service_account": "sa-alpha-prod",
    "notification_email": "alerts@example.com",
    "on_call_phone": "+1234567890",
    "sla_tier": "gold",
    "maintenance_window": "Sun 02:00-04:00",
    "data_retention_days": 90,
    "encryption_at_rest": true,
    "pii_present": false,
    "third_party_integrations": 3,
    "cost_center": "CC-8821",
    "department": "Engineering",
    "launch_date": "2024-11-01",
    "deprecated": false
}

const keys = Object.keys(small_unique_object).map(c => {
    return encoder.encode(c)
})

const binaryTree = generateBinaryTreeMatcher(keys)
const switchMathcer = generateNestedSwitchMatcher(keys)
const switchMathcerLength = generateOptimizedSwitchMatcher(keys)
const ternaryMathcer = generateTernaryMatcher(keys)

let keyToSearch = keys[5]

suite(
    'field_index_resolve',

    add('binarytree', () => binaryTree(keyToSearch)),
    add('switchMathcer', () => switchMathcer(keyToSearch)),
    add('switchMathcerLength', () => switchMathcerLength(keyToSearch)),
    add('ternaryMathcer', () => ternaryMathcer(keyToSearch)),

    cycle(),
    complete(),
)

export function generateBinaryTreeMatcher(predefinedArrays: Uint8Array[]) {
    const buildTree = (arrays: [Uint8Array, number][], depth = 0): any => {
        if (arrays.length === 0) return 'null'
        if (arrays.length === 1) {
            return JSON.stringify(arrays[0][1])
        }

        const groups = new Map()
        for (const [arr, j] of arrays) {
            if (depth >= arr.length) {
                if (!groups.has('__end__')) groups.set('__end__', [])
                groups.get('__end__').push([arr, j])
                continue;
            }
            const val = arr[depth]
            if (!groups.has(val)) groups.set(val, [])
            groups.get(val).push([arr, j])
        }

        const conditions = []
        for (const [val, groupArrays] of groups) {
            if (val === '__end__') {
                if (groupArrays.length === 1) {
                    conditions.push(`if (${depth} >= arr.length) return ${groupArrays[0][1]};`)
                } else {
                    const subtree = buildTree(groupArrays, depth + 1);
                    conditions.push(`if (${depth} >= arr.length) return ${subtree};`)
                }
                continue
            }

            const subtree = buildTree(groupArrays, depth + 1)
            conditions.push(`if (arr[${depth}] === ${val}) return ${subtree};`)
        }

        return `(() => { ${conditions.join(' ')} return null; })()`
    };

    const functionBody = `return ${buildTree(predefinedArrays.map((c, i) => [c, i]))};`

    return new Function('arr', functionBody)
}

export function generateNestedSwitchMatcher(predefinedArrays: Uint8Array[]) {
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

        const valueMap = new Map();

        for (let i = 0; i < arrays.length; i++) {
            const arr = arrays[i];
            const idx = indices[i];

            if (depth < arr.length) {
                const val = arr[depth];
                if (!valueMap.has(val)) valueMap.set(val, { arrays: [], indices: [] });
                valueMap.get(val).arrays.push(arr);
                valueMap.get(val).indices.push(idx);
            } else {
            }
        }

        let switchCode = `switch(arr[${depth}]) {\n`;

        for (const [val, { arrays: matchingArrays, indices: matchingIndices }] of valueMap) {
            switchCode += `    case ${val}: {\n`;
            const nested = buildSwitchTree(matchingArrays, matchingIndices, depth + 1);
            switchCode += `        ${nested}\n`;
            switchCode += `    }\n`;
        }

        switchCode += `    default: return -1;\n`;
        switchCode += `}\n`;

        return switchCode;
    };

    const indices = predefinedArrays.map((_, i) => i);

    const functionBody = `
        ${buildSwitchTree(predefinedArrays, indices, 0)}
        return -1;
    `;

    return new Function('arr', functionBody);
}

export function generateOptimizedSwitchMatcher(predefinedArrays: Uint8Array[]) {
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
            let code = `${indent}const val = arr[${depth}];\n`;
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

        let code = `${indent}switch(arr[${depth}]) {\n`;

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

    return new Function('arr', functionBody);
}

export function generateTernaryMatcher(predefinedArrays: Uint8Array[]) {
    const buildTernary = (arrays: Uint8Array[], indices: number[], depth = 0) => {
        if (arrays.length === 0) return 'null';
        if (arrays.length === 1) {
            return JSON.stringify(indices[0]);
        }

        const valueCounts = new Map();
        for (const arr of arrays) {
            const val = arr[depth];
            valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
        }

        const sortedVals = Array.from(valueCounts.keys())
            .sort((a, b) => valueCounts.get(b) - valueCounts.get(a));

        let ternary = '';
        for (let i = 0; i < sortedVals.length; i++) {
            const val = sortedVals[i];
            const matchingIndices: number[] = [];
            const matchingArrays: Uint8Array[] = [];

            for (let j = 0; j < arrays.length; j++) {
                if (arrays[j][depth] === val) {
                    matchingArrays.push(arrays[j]);
                    matchingIndices.push(indices[j]);
                }
            }

            const condition = i === 0 ? '' : ' : ';
            ternary += `${condition}arr[${depth}] === ${val} ? ${buildTernary(matchingArrays, matchingIndices, depth + 1)}`;
        }
        ternary += ' : null';

        return `(${ternary})`;
    };

    const initialIndices = predefinedArrays.map((_, idx) => idx);

    const functionBody = `
        return ${buildTernary(predefinedArrays, initialIndices)};
    `;

    return new Function('arr', functionBody);
}

