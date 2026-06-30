import { ObjectField, ObjectMeta } from "../metadata/types"

export function genObjectFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}

export function genObjectToJsonFactory1(...fields: ObjectField<any, any>[]) {
    let body = 'var f = m.fields;'
    body += 'return `{'
    body += fields
        .map((field, i) => {
            const key = field.name.value

            if (typeof key !== 'string')
                return ''

            return `"${key}":\${f[${i}].value.toJson(o.${key}, f[${i}].value)}`
        })
        .join(',')
    body += '}`'
    return new Function('o', 'm', body) as <T>(o: T, m: ObjectMeta<T>) => string
}
