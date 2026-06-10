import { BaseMeta, ObjectFieldMeta } from "./types"

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
