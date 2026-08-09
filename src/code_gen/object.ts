import { BaseMeta, ObjectField, ObjectMeta } from "../metadata/types"
import { nameof } from "../utils/types"

export function genObjectFactory<M extends ObjectMeta<any>>(fields: M['fields']): M['build'] {
    const assignments = fields
        .map((field, i) => `'${field.name.value}': v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as M['build']
}

export function genObjectToJsonFactory<M extends ObjectMeta<any>>(fields: M['fields']): M['toJson'] {
    let body = 'var f = m.fields;'
    body += 'return `{'
    const valueField = nameof<ObjectField<any, any>>('value')
    const toJsonField = nameof<BaseMeta<any, any>>('toJson')
    body += fields
        .map((key, i) => `"${key.name.value}":\${f[${i}].${valueField}.${toJsonField}(f[${i}].${valueField},v.${key},o)}`)
        .join(',')
    body += '}`'
    return new Function('m', 'v', 'o', body) as M['toJson']
}
