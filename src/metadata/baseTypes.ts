export const JSONT_STRING = 'string'
export const JSONT_NUMBER = 'number'
export const JSONT_BIGINT = 'bigint'
export const JSONT_BOOL = 'boolean'
export const JSONT_OBJECT = 'object'
export const JSONT_ARRAY = 'array'
export const JSONT_DATE = 'date'
export const JSONT_MAP = 'map'
export const JSONT_SET = 'set'

export const JSONT_U8 = 'u8'
export const JSONT_U16 = 'u16'
export const JSONT_U32 = 'u32'
export const JSONT_U64 = 'u64'
export const JSONT_I8 = 'i8'
export const JSONT_I16 = 'i16'
export const JSONT_I32 = 'i32'
export const JSONT_I64 = 'i64'
export const JSONT_F32 = 'f32'

export const JSONT_U8_ARRAY = 'u8[]'
export const JSONT_U16_ARRAY = 'u16[]'
export const JSONT_U32_ARRAY = 'u32[]'
export const JSONT_U64_ARRAY = 'u64[]'
export const JSONT_I8_ARRAY = 'i8[]'
export const JSONT_I16_ARRAY = 'i16[]'
export const JSONT_I32_ARRAY = 'i32[]'
export const JSONT_I64_ARRAY = 'i64[]'
export const JSONT_F32_ARRAY = 'f32[]'
export const JSONT_F64_ARRAY = 'f64[]'

export type BaseTypes =
    | typeof JSONT_STRING | typeof JSONT_NUMBER | typeof JSONT_BIGINT | typeof JSONT_BOOL
    | typeof JSONT_OBJECT | typeof JSONT_ARRAY | typeof JSONT_DATE | typeof JSONT_MAP
    | typeof JSONT_SET
    | typeof JSONT_U8 | typeof JSONT_U16 | typeof JSONT_U32 | typeof JSONT_U64
    | typeof JSONT_I8 | typeof JSONT_I16 | typeof JSONT_I32 | typeof JSONT_I64
    | typeof JSONT_F32
    | typeof JSONT_U8_ARRAY | typeof JSONT_U16_ARRAY | typeof JSONT_U32_ARRAY | typeof JSONT_U64_ARRAY
    | typeof JSONT_I8_ARRAY | typeof JSONT_I16_ARRAY | typeof JSONT_I32_ARRAY | typeof JSONT_I64_ARRAY
    | typeof JSONT_F32_ARRAY | typeof JSONT_F64_ARRAY