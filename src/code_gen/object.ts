import { ObjectMeta } from "../metadata/types"

export function genObjectFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}

export function genObjectToJsonFactory<T extends Record<string, any>>(value: ObjectMeta<T>) {
    let body = 'var f = m.fields'
    body += 'return `{'
    body += value.fields
        .map((field, i) => {
            const key = field.name.value

            if (typeof key !== 'string')
                return ''

            return `"${key}": \${f[${i}].toJson(o.${key}, f[${i}])},`
        })
        .join(',')
    body += '}`'
    return new Function('o', 'm', body) as (o: T, m: ObjectMeta<T>) => string
}
