import { MemoizeFactory, memoize } from "./utils/memo"
import { defaultOptions, JsonOptions, createOptions } from "./options"
import { BaseMeta, JsonParsingState } from "./metadata/types"
import { ArrayPool, arrayPool } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { Metadata, metadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/types"
import { IStack, Stack } from "./utils/stack"

type MetaOrData<T> = T extends BaseMeta<infer V> ? V : T

type JSONTOptions = {
    readonly metadataBuilder: Metadata
    readonly bufferPool: ArrayPool<Uint8Array<ArrayBuffer>>
    readonly jsonOptions: {
        readonly defaultOptions: JsonOptions
        readonly createOptions: typeof createOptions
    }
    readonly memoize: MemoizeFactory
}

const defaultJsontOptions: JSONTOptions = Object.freeze({
    metadataBuilder: metadata(),
    bufferPool: arrayPool<Uint8Array<ArrayBuffer>>(Uint8Array, 0),
    jsonOptions: { defaultOptions, createOptions },
    memoize: memoize,
})

export function jsont(value: JSONTOptions = defaultJsontOptions) {
    const { bufferPool, memoize } = value

    const optionsCache = memoize<Partial<JsonOptions>, JsonOptions>()
    const metadataCache = memoize<any, BaseMeta<any>>()

    const meta = metadata()

    const emptyStack: IStack<JsonParsingState> = Object.freeze({
        isEmpty: true,
        pop: () => undefined,
        peek: () => undefined,
        push: () => { }
    })

    function deserialize<T>(
        value: ArrayBuffer | Uint8Array | string,
        type: T,
        options?: Partial<JsonOptions>
    ): MetaOrData<T> {
        const opts = !!options ?
            optionsCache.getOrAdd(options, (key) => createOptions(key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataCache.getOrAdd(type, (t) => meta.from(t)) :
            type

        let bytes: Uint8Array<ArrayBuffer>
        let bytesLength: number = 0

        const isString = typeof value === 'string'
        if (isString) {
            const length = getMaxBytesCount(value.length)
            bytes = bufferPool.rent(length)
            const { written } = opts.encoder.encodeInto(value, bytes)
            bytesLength = written
        }
        else if (value instanceof ArrayBuffer) {
            bytes = new Uint8Array(value)
        }
        else if (value instanceof Uint8Array) {
            bytes = value as Uint8Array<ArrayBuffer>
        }
        else {
            throw new TypeError(
                `Invalid input type: expected string, ArrayBuffer, or Uint8Array, but received ${typeof value}`)
        }

        try {
            const result = metadata.toValue(metadata, {
                options: opts,
                reader: {
                    raw: isString ? value : undefined,
                    bytes,
                    bytesLength: bytesLength || bytes.length,
                    writable: false,
                    sparseIndex: {
                        charIndex: 0,
                        byteIndex: 0
                    },
                    onRelease: () => { }
                },
                stack: emptyStack,
            }, 0, 0)

            if (isError(result)) {
                throw result.error
            }

            if (isNeedsMoreData(result)) {
                throw new Error(`Incomplete JSON: sync parser expects full data. ` +
                    `In sync mode, data cannot be streamed - custom parser must receive complete data at once`)
            }

            return result.value
        }
        finally {
            if (isString)
                bufferPool.release(bytes)
        }
    }

    async function deserializeAsync<T>(
        json: ReadableStream<Uint8Array>,
        type: T,
        options?: Partial<JsonOptions>
    ): Promise<MetaOrData<T>> {
        const opts = !!options ?
            optionsCache.getOrAdd(options, (key) => createOptions(key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataCache.getOrAdd(type, (key) => meta.from(key)) :
            type

        const stack = new Stack<JsonParsingState>()

        const reader = json.getReader({ mode: 'byob' })

        const buffer = bufferPool.rent(655_350)

        let startIndex = 0
        try {
            while (true) {
                const buff = startIndex > 0 ? new Uint8Array(buffer.buffer, startIndex) : buffer
                const { value, done } = await reader.read(buff)

                if (value === undefined) {
                    break
                }

                const result = metadata.toValue(metadata, {
                    options: opts,
                    reader: {
                        bytes: value,
                        writable: !done
                    },
                    stack
                }, 0, 0)

                if (isNeedsMoreData(result)) {
                    buffer.copyWithin(0, result.nextIndex, buffer.length)
                    startIndex = result.nextIndex
                    continue
                }

                if (isError(result)) {
                    throw result.error
                }

                return result.value
            }

            throw new Error()
        } finally {
            bufferPool.release(buffer)
        }
    }

    function serialize<V, T>(value: V, type: T, options?: Partial<JsonOptions>): string {
        const opts = !!options ?
            optionsCache.getOrAdd(options, (key) => createOptions(key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataCache.getOrAdd(type, (key) => meta.from(key)) :
            type

        return metadata.toJson(metadata, value, opts)
    }

    return {
        deserialize,
        deserializeAsync,
        serialize
    }
}

export const { deserialize, deserializeAsync, serialize } = jsont(defaultJsontOptions)