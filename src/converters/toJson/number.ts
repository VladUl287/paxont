import { PrimitiveMeta } from "../../metadata/types"

type toJson = PrimitiveMeta<number>['toJson']
type toJsonBigInt = PrimitiveMeta<bigint>['toJson']

export const numberToJson: toJson = (meta, value, options) => {
    if (typeof value !== 'number') {
        throw new TypeError(`Expected number, got ${typeof value}`)
    }
    return value.toString()
}

const validateInt = (value: number, minValue: number, maxValue: number): void => {
    if (!Number.isInteger(value)) {
        throw new TypeError(`Expected integer, got ${typeof value}`)
    }
    if (value < minValue || value > maxValue) {
        throw new RangeError(`Integer value must be between ${minValue} and ${maxValue}, got ${value}`)
    }
}

export const i8ToJson: toJson = (meta, value, options) => {
    validateInt(value, -128, 127)
    return value.toString()
}

export const i16ToJson: toJson = (meta, value, options) => {
    validateInt(value, -32768, 32767)
    return value.toString()
}

export const i32ToJson: toJson = (meta, value, options) => {
    validateInt(value, -2147483648, 2147483647)
    return value.toString()
}

export const i64ToJson: toJsonBigInt = (meta, value, options) => {
    if (typeof value !== 'bigint') {
        throw new TypeError(`Expected bigint, got ${typeof value}`)
    }
    if (value < -9223372036854775808n || value > 9223372036854775807n) {
        throw new RangeError(`Integer value must be between -9223372036854775808 and 9223372036854775807, got ${value}`)
    }
    return value.toString()
}

export const u8ToJson: toJson = (meta, value, options) => {
    validateInt(value, 0, 255)
    return value.toString()
}

export const u16ToJson: toJson = (meta, value, options) => {
    validateInt(value, 0, 65535)
    return value.toString()
}

export const u32ToJson: toJson = (meta, value, options) => {
    validateInt(value, 0, 4294967295)
    return value.toString()
}

export const u64ToJson: toJsonBigInt = (meta, value, options) => {
    if (typeof value !== 'bigint') {
        throw new TypeError(`Expected bigint, got ${typeof value}`)
    }
    if (value < 0n || value > 18446744073709551615n) {
        throw new RangeError(`Integer value must be between 0 and 18446744073709551615, got ${value}`)
    }
    return value.toString()
}

export const bigIntToJson: toJsonBigInt = (meta, value, options) => {
    if (typeof value !== 'bigint') {
        throw new TypeError(`Expected bigint, got ${typeof value}`)
    }
    return value.toString()
}
