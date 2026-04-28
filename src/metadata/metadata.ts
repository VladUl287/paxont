import { generateSwitchMatcherPack } from "../code_gen/field"
import { TypeName } from "./types"

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
}

function getType(value: unknown): TypeName {
    if (value === null)
        throw new Error('invalid field type null')

    const typeMap = new Map<any, TypeName>([
        [Array, 'array'],
        [Date, 'date'],
        [Map, 'map'],
        [Set, 'set'],
        [Uint8Array, 'u8'],
        [Uint16Array, 'u16'],
        [Uint32Array, 'u32'],
        [BigUint64Array, 'u64'],
        [Int8Array, 'i8'],
        [Int16Array, 'i16'],
        [Int32Array, 'i32'],
        [BigInt64Array, 'i64'],
        [Float32Array, 'f32'],
        [Float64Array, 'f64'],
    ])

    for (const [constructor, typeName] of typeMap) {
        if (value instanceof constructor)
            return typeName
    }

    const type = typeof value

    if (type === 'undefined' || type === 'function')
        throw new Error(`invalid field type ${typeof value}`)

    return type
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
        }) as any
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