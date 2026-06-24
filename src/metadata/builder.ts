import { generateTrieSwitch } from "../code_gen/field"
import { genObjectFactory, genObjectToJsonFactory } from "../code_gen/object"
import { convertObject } from "../converters/toValue/object"
import { isPlainObject } from "../utils/object"
import { ObjectFieldMeta, ObjectMeta } from "./types"

type Builder<T, R> = (state: T) => R

class FunctionalBuilder<T, R = T> {
    constructor(private readonly buildFn: Builder<T, R>) { }

    map<U>(fn: (value: R) => U): FunctionalBuilder<T, U> {
        return new FunctionalBuilder((state: T) => fn(this.buildFn(state)))
    }

    chain<U>(fn: (value: R) => FunctionalBuilder<T, U>): FunctionalBuilder<T, U> {
        return new FunctionalBuilder((state: T) => fn(this.buildFn(state)).buildFn(state))
    }

    run(state: T): R {
        return this.buildFn(state)
    }
}

function builder<T, R = T>(fn: (state: T) => R) {
    return new FunctionalBuilder(fn)
}

const field = <T>(name: string) => {
    return builder<ObjectFieldMeta<T, any>>((state) => ({ ...state, name: { value: name, bytes: new Uint8Array() } }))
}

export const object = <T extends Record<string, any>>(
    ...fieldMetas: { [K in keyof T]: ObjectFieldMeta<T, K> }[keyof T][]
): ObjectMeta<T> => {
    const keys = fieldMetas.map(f => f.name.value as string)
    const factory = genObjectFactory(keys) as (values: T[keyof T][]) => T

    const keysBytes = fieldMetas.map(f => f.name.bytes)
    const fieldIndex = generateTrieSwitch(keysBytes, {
        pack: true
    }) as any

    const result = {
        type: 'object',
        fields: fieldMetas,
        factory: factory,
        fieldIndexResolver: fieldIndex,
        toValue: convertObject as any,
        toJson: (() => { }) as any,
    }

    result.toJson = genObjectToJsonFactory<T>(result)

    return result
}