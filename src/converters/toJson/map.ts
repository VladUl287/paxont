import { BaseMeta, MapMeta } from "../../metadata/types"

export const metaToJson: MapMeta<BaseMeta<any>>['toJson'] = (meta, value, options) => {
    const metaValue = meta.value
    const toJson = metaValue.toJson
    const entries = Array.from(value).map(c => `"${c[0]}":${toJson(metaValue, c[1], options)}`)
    return `{${entries.join(',')}}`
}
