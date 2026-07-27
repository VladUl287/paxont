import { ObjectMeta } from "../metadata/types"

export function genObjectFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}

export function genObjectToJsonFactory(fields: string[]): ObjectMeta<any>['toJson'] {
    let body = 'var f = m.fields;'
    body += 'return `{'
    body += fields
        .map((key, i) => `"${key}":\${f[${i}].toJson(f[${i}],v.${key},o)}`)
        .join(',')
    body += '}`'
    return new Function('m', 'v', 'o', body) as ObjectMeta<any>['toJson']
}
