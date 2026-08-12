export const STRING = 'string'
export const NUMBER = 'number'
export const BIGINT = 'bigint'
export const BOOL = 'boolean'
export const DATE = 'date'
export const NULLABLE = 'nullable'

export const OBJECT = 'object'
export const ARRAY = 'array'
export const MAP = 'map'
export const SET = 'set'

export const U8 = 'u8'
export const U16 = 'u16'
export const U32 = 'u32'
export const U64 = 'u64'
export const I8 = 'i8'
export const I16 = 'i16'
export const I32 = 'i32'
export const I64 = 'i64'

export const U8_ARRAY = 'u8[]'
export const U16_ARRAY = 'u16[]'
export const U32_ARRAY = 'u32[]'
export const U64_ARRAY = 'u64[]'
export const I8_ARRAY = 'i8[]'
export const I16_ARRAY = 'i16[]'
export const I32_ARRAY = 'i32[]'
export const I64_ARRAY = 'i64[]'
export const F64_ARRAY = 'f64[]'

export type BaseType = typeof STRING | typeof NUMBER | typeof BIGINT | typeof BOOL | typeof DATE | typeof NULLABLE | typeof OBJECT |
  typeof ARRAY | typeof MAP | typeof SET | typeof U8 | typeof U16 | typeof U32 | typeof U64 | typeof I8 | typeof I16 | typeof I32 |
  typeof I64 | typeof U8_ARRAY | typeof U16_ARRAY | typeof U32_ARRAY | typeof U64_ARRAY | typeof I8_ARRAY | typeof I16_ARRAY | typeof I32_ARRAY |
  typeof I64_ARRAY | typeof F64_ARRAY