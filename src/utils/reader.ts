import { CARRIAGE_RETURN, NEW_LINE, SPACE, TAB } from "../utils/ascii_symbols"

export type SparseIndex = {
    codeUnitIndex: number
    byteIndex: number
}

const lookup = new Uint8Array(256)
lookup[TAB] = 1
lookup[SPACE] = 1
lookup[NEW_LINE] = 1
lookup[CARRIAGE_RETURN] = 1

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

    public skipWhitespace(i: number): number {
        const b = this.bytes
        const bytesLen = this.bytesLength
        if (b[i] > SPACE) return i
        while (i < bytesLen && lookup[b[i]]) i++
        return i
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
