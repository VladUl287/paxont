import type { Metadata } from "./metadata"
import type { BaseMeta } from "./metadata/types"
import type { JsonOptions } from "./options"
import type { ArrayPool } from "./utils/array"
import type { MemoizeFactory } from "./utils/memo"

export type MetaOrData<T> = T extends BaseMeta<infer V> ? V : T

export type JsontOptions = {
    readonly metadata: Metadata
    readonly bufferPool: ArrayPool<Uint8Array<ArrayBuffer>>
    readonly defaultSerializeOptions: JsonOptions
    readonly memoize: MemoizeFactory
}