import { ArrayMeta, BaseMeta } from "../../metadata/types"

export const arrayToJson: ArrayMeta<ArrayLike<any>, BaseMeta<any>>['toJson'] = (meta, value, options) => {
    if (!Array.isArray(value) && !isTypedArray(value)) {
        throw new TypeError(`Expected Array, got ${typeof value}`)
    }
    const toJson = meta.value.toJson
    return `[${value.map(c => toJson(meta.value, c, options)).join(',')}]`
}

function isTypedArray(value: any): value is Array<any> {
    return ArrayBuffer.isView(value) && !(value instanceof DataView)
}
