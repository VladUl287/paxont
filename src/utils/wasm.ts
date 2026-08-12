export type WasmOptions = {
    readonly memory?: WebAssembly.Memory,
    readonly onError?: (error: unknown) => void
}

export function wasmInstance<T>(bytes: Uint8Array<ArrayBuffer>, options?: WasmOptions): T | undefined {
    try {
        if (options?.memory && options.memory instanceof WebAssembly.Memory) {
            return new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { memory: options.memory } }).exports as T
        }
        return new WebAssembly.Instance(new WebAssembly.Module(bytes)).exports as T
    }
    catch (error) {
        options?.onError?.(error)
        return undefined
    }
}