import { generateSwitchMatcherPack } from "../code_gen/field"

export type TypeName =
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "object"
    | "array"
    | "date"
    | "map"
    | "set"
    | "undefined"
    | "function"

export type Metadata = {
    readonly type: TypeName
    readonly name?: {
        value: string,
        bytes: Uint8Array<ArrayBuffer>
        equal: (bytes: Uint8Array, i: number) => boolean
    }
    readonly value?: Metadata | Metadata[]
    readonly defaultValue?: unknown
    readonly creator?: (props: any[]) => object
    readonly getFieldIndex?: (field: Uint8Array, index: number) => number
    readonly equals?: (index: number, field: Uint8Array, i: number) => boolean
}

function getType(value: unknown): TypeName {
    if (Array.isArray(value))
        return "array"

    if (value instanceof Date)
        return "date"

    if (value instanceof Map)
        return "map"

    if (value instanceof Set)
        return "set"

    return typeof value
}

export function createObjectBuilder(propertyNames: string[]): (fields: string[]) => object {
    const assignments = propertyNames
        .map((field, index) => `${field}: fields[${index}]`)
        .join(',')

    const body = `return {${assignments}}`

    return new Function("fields", body) as any
}

const encoder = new TextEncoder()
export function toMetadata(object: unknown): Metadata {
    const value = toValue(object)
    const creator = createObjectBuilder((value as Metadata[]).map(c => c.name!.value))

    return {
        defaultValue: object,
        type: getType(object),
        value: toValue(object),
        creator: creator,
        getFieldIndex: generateSwitchMatcherPack(
            Object.keys(object as any).map(c => encoder.encode(c)), {
            pack: true
        }) as any,
        equals: createNamesEquality(Object.keys(object as any).map(c => encoder.encode(c)))
    }

    function toValue(object: any): Metadata | Metadata[] | undefined {
        if (object === null || typeof object !== "object" || object instanceof Date)
            return

        if (Array.isArray(object))
            return {
                type: getType(object[0]),
                value: toValue(object[0])
            }

        return Object.keys(object)
            .map((key): Metadata => {
                return {
                    name: {
                        value: key,
                        bytes: encoder.encode(key),
                        equal: createNameEquality(encoder.encode(key))
                    },
                    type: getType(object[key]),
                    value: toValue(object[key]),
                    defaultValue: object[key]
                }
            })
    }
}

export function createNamesEquality(fields: Uint8Array[]): any {
    let body = `
        switch(index) {
    `

    for (let i = 0; i < fields.length; i++) {
        const field = [...fields[i]]

        const chunks = []
        let j = 0
        for (; j < field.length - 4; j += 4) {
            const a = field[j]
            const b = field[j + 1]
            const c = field[j + 2]
            const d = field[j + 3]

            const packValue = a << 0 | b << 8 | c << 16 | d << 24

            chunks.push(`((bytes[i+${j}]<<0 | bytes[i+${j + 1}]<<8 | bytes[i+${j + 2}]<<16 | bytes[i+${j + 3}]<<24) === ${packValue})`)
        }

        chunks.push(
            '(' + field
                .slice(j)
                .map((v, jj) => `bytes[i+${j + jj}]===${v}`)
                .join(' && ') + ')'
        )

        body += `case ${i}: return (${chunks.join(' && ')})\n`
    }

    body += '}'

    return new Function('index', 'bytes', 'i', body)
}

export function createNameEquality(bytes: Uint8Array): any {
    const field = [...bytes]

    const chunks = []
    let j = 0
    for (; j < field.length - 4; j += 4) {
        const a = field[j]
        const b = field[j + 1]
        const c = field[j + 2]
        const d = field[j + 3]

        const packValue = a << 0 | b << 8 | c << 16 | d << 24

        chunks.push(`((bytes[i+${j}]<<0 | bytes[i+${j + 1}]<<8 | bytes[i+${j + 2}]<<16 | bytes[i+${j + 3}]<<24) === ${packValue})`)
    }

    chunks.push(
        '(' + field
            .slice(j)
            .map((v, jj) => `bytes[i+${j + jj}]===${v}`)
            .join(' && ') + ')'
    )

    return new Function('bytes', 'i', 'return (' + chunks.join(' && ') + ')')
}