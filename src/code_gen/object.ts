import { ObjectFieldMeta } from "../metadata/types"

export function genObjectFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}

export function genObjectToJsonFactory1(...fields: ObjectFieldMeta<any, any, any>[]) {
    let body = 'var f = m.fields;'
    body += 'return `{'
    body += fields
        .map((field, i) => {
            const key = field.name.value

            if (typeof key !== 'string')
                return ''

            return `"${key}":\${f[${i}].toJson(d.${key},f[${i}],o)}`
        })
        .join(',')
    body += '}`'
    return new Function('d', 'm', 'o', body) as any
}
