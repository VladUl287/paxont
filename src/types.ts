import type { Metadata } from "./metadata"
import type { BaseMeta } from "./metadata/types"
import type { createOptions, JsonOptions } from "./options"
import type { ArrayPool } from "./utils/array"
import type { MemoizeFactory } from "./utils/memo"

export type MetaOrData<T> = T extends BaseMeta<infer V> ? V : T

export type JsontOptions = {
    readonly metadata: Metadata
    readonly bufferPool: ArrayPool<Uint8Array<ArrayBuffer>>
    readonly jsonOptions: {
        readonly defaultOptions: JsonOptions
        readonly createOptions: typeof createOptions
    }
    readonly memoize: MemoizeFactory
}