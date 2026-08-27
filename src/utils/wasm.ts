export type WasmOptions = {
    readonly imports?: WebAssembly.Imports,
    readonly onError?: (error: unknown) => void
}

export function wasmInstance<T>(bytes: Uint8Array<ArrayBuffer>, options?: WasmOptions): T | undefined {
    try {
        return new WebAssembly.Instance(
            new WebAssembly.Module(bytes), 
            { ...options?.imports ?? {} }
        ).exports as T
    }
    catch (error) {
        options?.onError?.(error)
        return undefined
    }
}