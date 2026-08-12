import { PrimitiveMeta } from "../../metadata/types"

export const stringToJson: PrimitiveMeta<string>['toJson'] = (meta, value, options) => {
    if (typeof value !== 'string') {
        throw new Error()
    }
    return `"${value}"`
}