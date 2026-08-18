import { memoize } from "./utils/memo"
import { defaultOptions, JsonOptions, createOptions } from "./options"
import { BaseMeta, JsonParsingState } from "./metadata/types"
import { arrayPool } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { metadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/types"
import { IStack, Stack } from "./utils/stack"
import { JsontOptions, MetaOrData } from "./types"

const defaultJsontOptions: JsontOptions = Object.freeze({
    metadata: metadata(),
    bufferPool: arrayPool<Uint8Array<ArrayBuffer>>(Uint8Array, 0),
    jsonOptions: { defaultOptions, createOptions },
    memoize: memoize,
})

export function jsont(options: Partial<JsontOptions> = defaultJsontOptions) {
    const { metadata: meta, memoize: memo, bufferPool } = <JsontOptions>{
        ...defaultJsontOptions,
        ...options
    }

    const optionsMemo = memo<Partial<JsonOptions>, JsonOptions>()
    const metaMemo = memo<any, BaseMeta<any>>()

    const emptyStack: IStack<JsonParsingState> = Object.freeze({
        isEmpty: true,
        pop: () => undefined,
        peek: () => undefined,
        push: () => { }
    })

    function deserialize<T>(
        value: ArrayBuffer | Uint8Array<ArrayBuffer> | string,
        type: T,
        options?: Partial<JsonOptions>
    ): MetaOrData<T> {
        const opts = options === undefined ? defaultOptions : optionsMemo.getOrAdd(options, (o) => createOptions(o))
        const metadata = isMetadata(type) ? type : metaMemo.getOrAdd(type, (t) => meta.from(t))

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
            let funcs: Array<() => void> | undefined

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
                    onRelease: (func) => {
                        (funcs ??= new Array(1)).push(func)
                    }
                },
                stack: emptyStack
            }, 0, 0)

            funcs?.forEach((fn) => fn())

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
            if (isString) { bufferPool.release(bytes) }
        }
    }

    async function deserializeAsync<T>(
        json: ReadableStream<Uint8Array>,
        type: T,
        options?: Partial<JsonOptions>
    ): Promise<MetaOrData<T>> {
        const opts = !!options ?
            optionsMemo.getOrAdd(options, (key) => createOptions(key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metaMemo.getOrAdd(type, (key) => meta.from(key)) :
            type

        const stack = new Stack<JsonParsingState>()

        const reader = json.getReader({ mode: 'byob' })

        const buffer = bufferPool.rent(655_360)

        let start = 0
        try {
            while (true) {
                const buff = start > 0 ? new Uint8Array(buffer.buffer, start) : buffer
                const { value, done } = await reader.read(buff)

                if (value === undefined) {
                    break
                }

                let funcs: Array<() => void> | undefined

                const result = metadata.toValue(metadata, {
                    options: opts,
                    reader: {
                        bytes: value,
                        bytesLength: value.length,
                        writable: !done,
                        onRelease: (func) => {
                            (funcs ??= new Array(1)).push(func)
                        }
                    },
                    stack
                }, 0, 0)

                funcs?.forEach((fn) => fn())

                if (isError(result)) {
                    throw result.error
                }

                if (isNeedsMoreData(result)) {
                    buffer.copyWithin(0, result.nextIndex, buffer.length)
                    start = result.nextIndex
                    continue
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
            optionsMemo.getOrAdd(options, (key) => createOptions(key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metaMemo.getOrAdd(type, (key) => meta.from(key)) :
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