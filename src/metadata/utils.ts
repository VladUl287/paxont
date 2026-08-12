import { BaseMeta } from "./types"

export function isMetadata(value: unknown): value is BaseMeta<any> {
    if (!value || typeof value !== 'object')
        return false

    const potential = value as BaseMeta<any>
    return typeof potential.toValue === 'function' &&
        typeof potential.toJson === 'function' &&
        typeof potential.type === 'string'
}

export function isMetadataContainer(value: unknown): value is BaseMeta<any> & { value: BaseMeta<any> } {
    if (!value || typeof value !== 'object')
        return false

    const potential = value as BaseMeta<any>
    return typeof potential.toValue === 'function' &&
        typeof potential.toJson === 'function' &&
        typeof potential.type === 'string' &&
        'value' in potential && typeof potential.value === 'object'
}
