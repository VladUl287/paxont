export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array

export function isTypedArray(data: unknown): data is TypedArray {
  if (!data) return false
  
  return data instanceof Int8Array ||
    data instanceof Uint8Array ||
    data instanceof Int16Array ||
    data instanceof Uint16Array ||
    data instanceof Int32Array ||
    data instanceof Uint32Array ||
    data instanceof Float32Array ||
    data instanceof Float64Array ||
    data instanceof BigInt64Array ||
    data instanceof BigUint64Array
}
