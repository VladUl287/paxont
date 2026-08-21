export type SparseIndex = {
    codeUnitIndex: number
    byteIndex: number
}

export class JsonReader {
    private readonly releaseCallbacks: Array<() => void> = []

    public readonly sparseIndex?: SparseIndex

    constructor(
        public readonly bytes: Uint8Array,
        public readonly bytesLength: number,
        public readonly writable: boolean,
        public readonly raw?: string,
        sparseIndex?: SparseIndex
    ) {
        if (raw !== undefined) {
            this.sparseIndex = sparseIndex ?? { codeUnitIndex: 0, byteIndex: 0 }
        }
    }
    
    public onRelease(callback: () => void) {
        this.releaseCallbacks.push(callback)
    }

    public release(onError?: (error: unknown) => void) {
        this.releaseCallbacks.forEach(function (this: typeof onError, fn) {
            try {
                fn()
            } catch (error) {
                this?.(error)
            }
        }, onError)
        this.releaseCallbacks.length = 0
    }
}
