import { BaseMeta } from "./types"

export function isMetadata1(value: unknown): value is BaseMeta<any, any> {
    if (!value || typeof value !== 'object')
        return false

    const potential = value as BaseMeta<any, any>
    return typeof potential.toValue === 'function' &&
        typeof potential.toJson === 'function' &&
        typeof potential.type === 'string'
}
