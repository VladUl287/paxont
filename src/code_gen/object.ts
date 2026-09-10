import { ObjectField, ObjectMeta } from "../metadata/types"
import { nameof } from "../utils/types"

export function genObjectFactory<M extends ObjectMeta<any>>(fields: string[]): M['build'] {
    const assignments = fields
        .map((field, i) => `'${field}': v[${i}]`)
        .join(',')
    
    return new Function("v", `return{${assignments}}`) as M['build']

    // const assignments = fields
    //     .map((field, i) => `this.${field} = v[${i}]`)
    //     .join(';')

    // const ctor = new Function('v', `${assignments}`) as any

    // return (v: any[]) => new ctor(v)
}

export function genObjectToJsonFactory<M extends ObjectMeta<any>>(fields: string[]): M['toJson'] {
    const value = nameof<ObjectField<any, any>>('value')
    const toJson = nameof<ObjectMeta<any>>('toJson')
    const field = fields
        .map((field, i) => `"${field}":\${f[${i}].${value}.${toJson}(f[${i}].${value},v['${field}'],o)}`)
        .join(',')
    const body = `var f = m.fields;return \`{${field}}\``
    return new Function('m', 'v', 'o', body) as M['toJson']
}
