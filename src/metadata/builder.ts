import { generateTrieSwitch } from "../code_gen/field"
import { genObjectFactory } from "../code_gen/object"
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

const encoder = new TextEncoder()

export const object = <T extends object>(value: T): ObjectMeta<T> => {
    if (!isPlainObject(value)) throw new Error('')

    const keys = Object.keys(value)
    const keysBytes = keys.map(k => encoder.encode(k))
    const factory = genObjectFactory(keys) as (values: T[keyof T][]) => T
    const fieldIndex = generateTrieSwitch(keysBytes, {
        pack: true
    }) as any

    const result: ObjectMeta<T> = {
        type: 'object',
        factory: factory,
        fieldIndexResolver: fieldIndex,
        fields: [],
        toValue: convertObject as any,
        toJson: {} as any,
    }

    return result
}