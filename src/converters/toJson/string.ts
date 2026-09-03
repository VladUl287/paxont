import { PrimitiveMeta } from "../../metadata/types"

export const stringToJson: PrimitiveMeta<string>['toJson'] = (meta, value, options) => {
    if (typeof value !== 'string') {
        throw new TypeError(`Expected string, got ${typeof value}`)
    }
    return JSON.stringify(value)
}