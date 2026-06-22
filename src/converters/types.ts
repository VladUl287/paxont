import { Metadata } from "../metadata/metadata"
import { ConvertCtx, ConvertResult } from "../metadata/types"
import { JsonOptions } from "../options"

export type ConvertMeta = Metadata | Metadata[]

export const isSingleMeta = (meta: ConvertMeta): meta is Metadata => !Array.isArray(meta)
export const isMultiMeta = (meta: ConvertMeta): meta is Metadata[] => Array.isArray(meta)

export type Converter<T> = (ctx: ConvertCtx, meta: ConvertMeta, index: number, depth: number) => ConvertResult<T>
