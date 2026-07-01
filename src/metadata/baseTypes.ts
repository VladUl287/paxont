export const JSONT = Object.freeze({
  STRING: 'string',
  NUMBER: 'number',
  BIGINT: 'bigint',
  BOOL: 'boolean',
  DATE: 'date',
  NULLABLE: 'nullable',
  
  OBJECT: 'object',
  ARRAY: 'array',
  MAP: 'map',
  SET: 'set',
  
  U8: 'u8',
  U16: 'u16',
  U32: 'u32',
  U64: 'u64',
  I8: 'i8',
  I16: 'i16',
  I32: 'i32',
  I64: 'i64',
  F32: 'f32',
  
  U8_ARRAY: 'u8[]',
  U16_ARRAY: 'u16[]',
  U32_ARRAY: 'u32[]',
  U64_ARRAY: 'u64[]',
  I8_ARRAY: 'i8[]',
  I16_ARRAY: 'i16[]',
  I32_ARRAY: 'i32[]',
  I64_ARRAY: 'i64[]',
  F32_ARRAY: 'f32[]',
  F64_ARRAY: 'f64[]',
})

export type BaseType = (typeof JSONT)[keyof typeof JSONT]