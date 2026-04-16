import { TypeName } from "../metadata/metadata"
import { Converter } from "../converters/types"

export type JsonOptions = {
    readonly encoder: TextEncoder
    readonly decoder: TextDecoder
    readonly converters: {
        [key in TypeName]?: Converter<unknown>
    }
    readonly maxDepth: number
    readonly allowTrailingCommas: boolean,
    readonly fieldCaseInsensitive: boolean
    readonly allowDuplicateProperties: boolean
}
