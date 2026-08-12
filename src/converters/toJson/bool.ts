import { PrimitiveMeta } from "../../metadata/types"

export const boolToJson: PrimitiveMeta<boolean>['toJson'] = (meta, value, options) => {
    if (typeof value !== 'boolean') {
        throw new Error()
    }
    return value.toString()
}