import { ArrayMeta } from "../../metadata/types"

export const arrayToJson: ArrayMeta<any, any>['toJson'] = (meta, value, options) => {
    if (!Array.isArray(value) || !isTypedArray(value)) {
        throw new Error()
    }
    const toJson = meta.value.toJson
    return `[${value.map(c => toJson(meta.value, c, options)).join(',')}]`
}

function isTypedArray(value: any): value is ArrayLike<any> {
    return ArrayBuffer.isView(value) && !(value instanceof DataView)
}
