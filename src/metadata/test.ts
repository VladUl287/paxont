import { number, string } from "./builder"
import { BaseMeta } from "./types"

type ObjectMeta<T> = { [K in keyof T]: T[K] } & { [x: string]: any }

type Expand<T> = T extends object ? { [K in keyof T]: T[K] } : T

type FieldModifier<K extends string, V extends BaseMeta<any, any>> = <T>(obj: ObjectMeta<T>) => ObjectMeta<Expand<T & { [P in K]: V }>>

type ApplyModifier<Mod, Obj> =
  Mod extends <T>(obj: ObjectMeta<T>) => ObjectMeta<infer R>
  ? Obj extends ObjectMeta<infer U> ? Expand<U & R> : never
  : never

type CombineModifiers<Mods extends any[], Acc> =
  Mods extends [infer First, ...infer Rest]
  ? CombineModifiers<Rest, ApplyModifier<First, Acc>>
  : Acc

declare function b<Mods extends any[]>(
  ...mods: Mods
): ObjectMeta<CombineModifiers<Mods, {}>>

declare function _field<K extends string, V extends BaseMeta<any, any>>(
  name: K,
  value: V
): FieldModifier<K, V>

const result = b(
  _field('id', number()),
  _field('name', string())
)