export type SparseIndex = {
    charIndex: number
    byteIndex: number
}

export class JsonReader {
    private readonly releaseCallbacks: Array<() => void> = []

    public raw?: string
    public sparseIndex?: SparseIndex

    constructor(
        public readonly bytes: Uint8Array,
        public readonly bytesLength: number,
        public readonly writable: boolean
    ) { }

    public setStringSource(raw: string, sparseIndex: SparseIndex = { charIndex: 0, byteIndex: 0 }) {
        this.raw = raw
        this.sparseIndex = sparseIndex
        return this
    }

    public onRelease(callback: () => void) {
        this.releaseCallbacks.push(callback)
    }

    public release(onError?: (error: unknown) => void) {
        this.releaseCallbacks.forEach((fn) => {
            try {
                fn()
            } catch (error) {
                onError?.(error)
            }
        })
        this.releaseCallbacks.length = 0
    }
}
