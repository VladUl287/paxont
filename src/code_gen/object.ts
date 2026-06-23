export function genObjectFactory(fields: string[]): (values: unknown[]) => object {
    const assignments = fields
        .map((field, i) => `${field}: v[${i}]`)
        .join(',')
    return new Function("v", `return {${assignments}}`) as (values: unknown[]) => object
}