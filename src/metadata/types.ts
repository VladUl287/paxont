export type BuiltInType =
    | "string" | "number" | "bigint" | "boolean" | "symbol"
    | "object" | "array" | "date" | "map" | "set"
    | "u8" | "u16" | "u32" | "u64"
    | "i8" | "i16" | "i32" | "i64"
    | "f32" | "f64"

export type TypeName = BuiltInType | (string & {})

export type Metadata = MetaPrimitive | MetaObject | MetaArray

export type MetaObject = {
    readonly fields: Metadata[]
    readonly factory: (props: unknown[]) => object
    readonly getFieldIndex: (field: Uint8Array, index: number) => number
}

export type MetaPrimitive = {
    readonly type: TypeName
    readonly name: {
        value: string,
        bytes: Uint8Array<ArrayBuffer>
        equal: (bytes: Uint8Array, i: number) => boolean
    }
    readonly value: Metadata
}

export type MetaArray = {
    readonly type: TypeName
    readonly value: Metadata
}

export const isPrimitive = (meta: Metadata): meta is MetaPrimitive =>
    meta !== null &&
    typeof meta === 'object' &&
    'type' in meta &&
    'name' in meta &&
    'value' in meta &&
    !('fields' in meta) &&
    !('factory' in meta)

export const isObject = (meta: Metadata): meta is MetaObject =>
    meta !== null &&
    typeof meta === 'object' &&
    'fields' in meta &&
    'factory' in meta &&
    'getFieldIndex' in meta &&
    !('name' in meta)

export const isArray = (meta: Metadata): meta is MetaArray =>
    meta !== null &&
    typeof meta === 'object' &&
    'type' in meta &&
    'value' in meta &&
    !('name' in meta) &&
    !('fields' in meta);