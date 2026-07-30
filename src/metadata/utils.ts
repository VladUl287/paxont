import { BaseMeta, JSONTMetaTag } from "./types"

export function isMetadata(value: unknown): value is BaseMeta<any, any> {
    return typeof value === 'object' &&
        value !== null &&
        (value as object & Record<typeof JSONTMetaTag, unknown>)[JSONTMetaTag] === true
}
