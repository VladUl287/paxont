export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export function nameof<T>(key: Extract<keyof T, string>): Extract<keyof T, string> {
    return key
}