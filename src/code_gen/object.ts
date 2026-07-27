import { ObjectFieldMeta } from "../metadata/types"

export function genObjectFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}

export function genObjectToJsonFactory(fields: string[]): (fields: ObjectFieldMeta<any, any, any>[]) => string {
    let body = 'var f = m.fields;'
    body += 'return `{'
    body += fields
        .map((key, i) => `"${key}":\${f[${i}].toJson(d.${key},f[${i}],o)}`)
        .join(',')
    body += '}`'
    return new Function('d', 'm', 'o', body) as (fields: ObjectFieldMeta<any, any, any>[]) => string
}
