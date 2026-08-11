import { ObjectMeta } from "../metadata/types"
import { nameof } from "../utils/types"

export function genObjectFactory<M extends ObjectMeta<any>>(fields: M['fields']): M['build'] {
    const assignments = fields
        .map((field, i) => `'${field.name.value}': v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as M['build']
}

export function genObjectToJsonFactory<M extends ObjectMeta<any>>(fields: M['fields']): M['toJson'] {
    const toJson = nameof<ObjectMeta<any>>('toJson')
    const field = fields
        .map((field, i) => `"${field.name.value}":f[${i}].${toJson}(f[${i}],v.${field},o)`)
        .join(',')
    return new Function('m', 'v', 'o', `var f = m.fields;return \`{${field}}\``) as M['toJson']
}
