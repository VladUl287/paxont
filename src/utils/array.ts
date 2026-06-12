export function isTypedArray(data: unknown):
    data is Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array |
    Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array {
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

export function equals(a: Uint8Array, b: Uint8Array, aI: number, bI: number): boolean {
    const length = Math.min(a.length - aI, b.length - bI)
    if (length <= 0) return true

    let i = 0
    while (i < length) {
        if (a[aI + i] !== b[bI + i])
            return false
        i++
    }

    return true
}

export function pool<T>() {
    const store = new Map<number, T[]>()

    const getLength = (minLength: number): number =>
        Math.pow(2, Math.ceil(Math.log2(minLength)))

    const rent = (minLength: number): T[] => {
        const length = getLength(minLength)

        let result = store.get(length)
        if (result)
            return result

        result = new Array<T>(length)
        store.set(length, result)
        return result
    }

    const restore = (array: T[]): void => {
        store.set(array.length, array)
    }

    return {
        rent: rent,
        restore: restore
    }
}