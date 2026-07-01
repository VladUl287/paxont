import { BaseMeta } from "./types"

export function isMetadata(value: unknown): value is BaseMeta<any, any> {
    if (!value || typeof value !== 'object')
        return false

    const potential = value as Record<string, unknown>

    const hasToValue = typeof potential.toValue === 'function'
    const hasToJson = typeof potential.toJson === 'function'
    const hasType = typeof potential.type === 'string'

    return hasToValue && hasToJson && hasType
}
