import { Metadata } from "../metadata/metadata"
import { ConvertCtx } from "../metadata/types"
import { ReadResult } from "../utils/types"

export type ConvertMeta = Metadata | Metadata[]

export const isSingleMeta = (meta: ConvertMeta): meta is Metadata => !Array.isArray(meta)
export const isMultiMeta = (meta: ConvertMeta): meta is Metadata[] => Array.isArray(meta)

export type Converter<T> = (ctx: ConvertCtx, meta: ConvertMeta, index: number, depth: number) => ReadResult<T>
