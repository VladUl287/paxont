import { BaseMeta, SetMeta } from "../../metadata/types"

export const setToJson: SetMeta<BaseMeta<any>>['toJson'] = (meta, value, options) => {
    if (!(value instanceof Set)) {
        throw new TypeError(`Expected Set, got ${typeof value}`)
    }
    const metaValue = meta.value
    const toJson = metaValue.toJson
    const entries = Array.from(value).map(value => toJson(metaValue, value, options))
    return `[${entries.join(',')}]`
}
