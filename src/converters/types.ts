import { Metadata } from "../metadata/metadata"
import { ConvertResult } from "../metadata/types"
import { JsonOptions } from "../options"

export type ConvertState = {
    readonly bytes: Uint8Array
    readonly options: JsonOptions
}

export type ConvertMeta = Metadata | Metadata[]

export const isSingleMeta = (meta: ConvertMeta): meta is Metadata => !Array.isArray(meta)
export const isMultiMeta = (meta: ConvertMeta): meta is Metadata[] => Array.isArray(meta)

export type Converter<T> = (ctx: ConvertState, meta: ConvertMeta, index: number, depth: number) => ConvertResult<T>
