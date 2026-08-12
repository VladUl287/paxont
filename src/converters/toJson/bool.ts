import { PrimitiveMeta } from "../../metadata/types"

export const boolToJson: PrimitiveMeta<boolean>['toJson'] = (meta, value, options) => {
    if (typeof value !== 'boolean') {
        throw new TypeError(`Expected boolean, got ${typeof value}`)
    }
    return value.toString()
}