import { ArrayPool } from "../utils/array"
import { Modifier } from "./builder"
import { ArrayMeta, BaseMeta, MetaValue, ObjectMeta, SetMeta, TypeName } from "./types"

export const modifiers = () => {
    return {
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

            const field = <K extends string, M extends BaseMeta<any>>(
                name: K,
                value: M,
                encoder = new TextEncoder()
            ): Modifier<ObjectMeta<{ [P in K]: M }>> => {
                return (m) => {
                    m.fields.push({
                        name: {
                            value: name,
                            bytes: encoder.encode(name)
                        },
                        value: value
                    })
                    return m
                }
            }

            return { builder, field }
        }
    }
}

export const { objectModifiers, setModifiers, arrayModifiers } = modifiers()
