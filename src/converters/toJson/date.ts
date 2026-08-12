import { PrimitiveMeta } from "../../metadata/types"

export const dateToJson: PrimitiveMeta<Date>['toJson'] = (meta, value, options) => {
    if (!(value instanceof Date)) {
        throw new Error()
    }
    return `"${value.toISOString()}"`
}