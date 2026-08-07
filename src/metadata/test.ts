type PrimitiveMeta<T> = { value: T }
type ObjectMeta<T> = { [K in keyof T]: T[K] } & { [x: string]: any }

type Expand<T> = T extends object ? { [K in keyof T]: T[K] } : T

type FieldModifier<K extends string, V> = <T>(
  obj: ObjectMeta<T>
) => ObjectMeta<Expand<T & { [P in K]: V }>>

type ApplyModifier<Mod, Obj> =
  Mod extends <T>(obj: ObjectMeta<T>) => ObjectMeta<infer R>
    ? Obj extends ObjectMeta<infer U>
      ? Expand<U & R>
      : never
    : never

type CombineModifiers<Mods extends any[], Acc> =
  Mods extends [infer First, ...infer Rest]
    ? CombineModifiers<Rest, ApplyModifier<First, Acc>>
    : Acc

declare function b<Mods extends any[]>(
  ...mods: Mods
): CombineModifiers<Mods, ObjectMeta<{}>>

declare function _field<K extends string, V>(
  name: K,
  value: V
): FieldModifier<K, V>

const result = b(
    _field('id', 42),
    _field('name', "")
)