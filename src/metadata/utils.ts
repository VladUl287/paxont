import { MAP, OBJECT } from "./baseTypes"
import { BaseMeta, MapMeta, ObjectMeta } from "./types"

export function isMeta(value: unknown): value is BaseMeta<any> {
    if (!value || typeof value !== 'object')
        return false

    const potential = value as BaseMeta<any>
    return typeof potential.toValue === 'function' &&
        typeof potential.toJson === 'function' &&
        typeof potential.type === 'string'
}

export function isMetaContainer(value: unknown): value is BaseMeta<any> {
    return isMeta(value) && 'value' in value && isMeta(value.value)
}

export function isObjectMeta(value: unknown): value is ObjectMeta<any> {
    return isMeta(value) && value.type === OBJECT &&
        'fields' in value && Array.isArray(value.fields) &&
        'build' in value && typeof value.build === 'function' &&
        'getFieldIndex' in value && typeof value.getFieldIndex === 'function'
}

export function isMapMeta(value: unknown): value is MapMeta<any> {
    return isMetaContainer(value) && value.type === MAP && 'key' in value && isMeta(value.key)
}
