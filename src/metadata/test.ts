import { number, string } from "./builder"
import { BaseMeta, Obj, ObjectMeta } from "./types"

type Expand<T> = T extends object ? { [K in keyof T]: T[K] } : T

type FieldModifier<K extends string, V extends BaseMeta<any, any>> = <T extends {}>(obj: ObjectMeta<T>) =>
  ObjectMeta<Expand<T & { [P in K]: V }>>

declare function _field<K extends string, V extends BaseMeta<any, any>>(
  name: K,
  value: V
): FieldModifier<K, V>

type ApplyModifier<Mod, O> =
  Mod extends (obj: ObjectMeta<any>) => ObjectMeta<infer R>
  ? Expand<O & R>
  : never

type CombineModifiers<Mods extends any[], Acc extends Obj> =
  Mods extends [infer First, ...infer Rest]
  ? CombineModifiers<Rest, ApplyModifier<First, Acc>>
  : Acc

declare function b<Mods extends any[]>(
  ...mods: Mods
): ObjectMeta<CombineModifiers<Mods, {}>>

const result = b(
  _field('id', number()),
  _field('name', string())
)