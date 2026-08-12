import { BaseMeta, SetMeta } from "../../metadata/types"

export const setToJson: SetMeta<BaseMeta<any>>['toJson'] = (meta, value, options) => {
    const metaValue = meta.value
    const toJson = metaValue.toJson
    const entries = Array.from(value).map(value => toJson(metaValue, value, options))
    return `[${entries.join(',')}]`
}
