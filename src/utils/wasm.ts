export function wasmInstance<T>(bytes: Uint8Array<ArrayBuffer>, memory?: WebAssembly.Memory): T | undefined {
    try {
        if (memory) {
            return new WebAssembly.Instance(new WebAssembly.Module(bytes), { env: { memory: memory } }).exports as T
        }
        return new WebAssembly.Instance(new WebAssembly.Module(bytes)).exports as T
    }
    catch (error) {
        console.error(error)
        return undefined
    }
}