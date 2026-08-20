import { ArrayPool } from "../utils/array"
import { Modifier } from "./builder"
import { ArrayMeta, BaseMeta, MetaValue, ObjectMeta, SetMeta } from "./types"

export const modifiers = () => {
    const toJson = <M extends BaseMeta<any>>(converter: M['toJson']) =>
        (m: M) => ({ ...m, toJson: converter })

    return {
        toJson,
        setModifiers: () => {
            const keySelector = <M extends SetMeta<any>>(selector: (value: MetaValue<M['value']>) => any): Modifier<M> =>
                (meta: M): M => ({ ...meta, key: selector })

            return { keySelector }
        },
        arrayModifiers: () => {
            const pool = <M extends ArrayMeta<any, any>>(pool: ArrayPool<MetaValue<M>>): Modifier<M> =>
                (meta: M): M => ({ ...meta, pool })

            return { pool }
        },
        objectModifiers: () => {
            const builder = <M extends ObjectMeta<{}>>(build: M['build']) =>
                (m: M): M => ({ ...m, build })

            return { builder }
        }
    }
}

export const { toJson, objectModifiers, setModifiers, arrayModifiers } = modifiers()
export const { keySelector } = setModifiers()
export const { pool } = arrayModifiers()
export const { builder } = objectModifiers()
