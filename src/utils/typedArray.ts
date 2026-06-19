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

export type TypedArrayCtors =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor

export type TypedArrayCtor<T extends TypedArray> =
  T extends Int8Array ? Int8ArrayConstructor :
  T extends Uint8Array ? Uint8ArrayConstructor :
  T extends Int16Array ? Int16ArrayConstructor :
  T extends Uint16Array ? Uint16ArrayConstructor :
  T extends Int32Array ? Int32ArrayConstructor :
  T extends Uint32Array ? Uint32ArrayConstructor :
  T extends Float32Array ? Float32ArrayConstructor :
  T extends Float64Array ? Float64ArrayConstructor :
  T extends BigInt64Array ? BigInt64ArrayConstructor :
  T extends BigUint64Array ? BigUint64ArrayConstructor :
  never


export type TypedArrayElement<T extends TypedArray> =
  T extends Int8Array ? number :
  T extends Uint8Array ? number :
  T extends Int16Array ? number :
  T extends Uint16Array ? number :
  T extends Int32Array ? number :
  T extends Uint32Array ? number :
  T extends Float32Array ? number :
  T extends Float64Array ? number :
  T extends BigInt64Array ? bigint :
  T extends BigUint64Array ? bigint :
  never

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
