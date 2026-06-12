import { Metadata } from "../metadata/metadata"
import { JsonOptions } from "../options"

export type ConvertState = {
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type ConvertMeta = Metadata | Metadata[]

export const isSingleMeta = (meta: ConvertMeta): meta is Metadata => !Array.isArray(meta)
export const isMultiMeta = (meta: ConvertMeta): meta is Metadata[] => Array.isArray(meta)

export type Converter<T> = (ctx: ConvertState, meta: ConvertMeta, index: number, depth: number) => ConvertResult<T>

type Success<T> = {
    readonly value: T
    readonly nextIndex: number
}

type Error = {
    readonly error: string
}

export type ConvertResult<T> = Success<T> | Error

export function isError<T>(result: ConvertResult<T>): result is Error {
    return 'error' in result && result.error !== undefined
}

export function isSuccess<T>(result: ConvertResult<T>): result is Success<T> {
    return 'value' in result && 'nextIndex' in result
}