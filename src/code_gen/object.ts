import { BaseMeta, ObjectField, ObjectMeta } from "../metadata/types"
import { nameof } from "../utils/types"

type FieldArrayToRecord<T extends readonly string[]> = {
    [K in T[number]]: unknown
}

export function genObjectFactory<T extends readonly string[]>(fields: T): (values: unknown[]) => FieldArrayToRecord<T> {
    const assignments = fields
        .map((field, i) => `'${field}': v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => FieldArrayToRecord<T>
}

export function genObjectToJsonFactory(fields: string[]): ObjectMeta<any>['toJson'] {
    let body = 'var f = m.fields;'
    body += 'return `{'
    const valueField = nameof<ObjectField<any, any>>('value')
    const toJsonField = nameof<BaseMeta<any, any>>('toJson')
    body += fields
        .map((key, i) => `"${key}":\${f[${i}].${valueField}.${toJsonField}(f[${i}].${valueField},v.${key},o)}`)
        .join(',')
    body += '}`'
    return new Function('m', 'v', 'o', body) as ObjectMeta<any>['toJson']
}
