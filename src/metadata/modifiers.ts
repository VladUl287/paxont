import { ArrayPool } from "../utils/array"
import { Modifier } from "./builder"
import { ArrayMeta, MetaValue, SetMeta } from "./types"

export const keySelector = <M extends SetMeta<any>>(
    selector: (value: M extends SetMeta<infer U> ? MetaValue<U> : never) => any
): Modifier<M> => {
    return (meta: M): M => ({ ...meta, key: selector })
}

export const pool = <M extends ArrayMeta<any, any>>(
    pool: ArrayPool<M extends ArrayMeta<infer U, any> ? U : never>
): Modifier<M> => {
    return (meta: M): M => ({ ...meta, pool })
}