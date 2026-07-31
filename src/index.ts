import { MemoFactory, memo } from "./utils/memo"
import { defaultOptions, JsonOptions, mergeOptions } from "./options"
import { BaseMeta, ParseState } from "./metadata/types"
import { ArrayPool, arrayPool } from "./utils/array"
import { getMaxBytesCount } from "./utils/utf8"
import { isMetadata } from "./metadata/utils"
import { Metadata, metadata } from "./metadata"
import { isError, isNeedsMoreData } from "./utils/types"
import { IStack, Stack } from "./utils/stack"

type MetaOrData<T> = T extends BaseMeta<infer V, any> ? V : T

type JSONTOptions = {
    readonly metadataBuilder: Metadata
    readonly arrayPool: ArrayPool<Uint8Array>
    readonly jsonOptions: {
        readonly defaultOptions: JsonOptions
        readonly mergeOptions: typeof mergeOptions
    }
    readonly memo: MemoFactory
}

const defaultJsontOptions: JSONTOptions = Object.freeze({
    metadataBuilder: metadata(),
    arrayPool: arrayPool<Uint8Array>(Uint8Array),
    jsonOptions: {
        defaultOptions: defaultOptions,
        mergeOptions: mergeOptions
    },
    memo,
})

export function jsont(value: JSONTOptions = defaultJsontOptions) {
    const { arrayPool, memo } = value

    const optionsMemo = memo<Partial<JsonOptions>, JsonOptions>()
    const metadataMemo = memo<any, BaseMeta<any, any>>()

    const meta = metadata()

    const emptyStack: IStack<ParseState> = Object.freeze({
        isEmpty: true,
        pop: () => undefined,
        push: () => { }
    })

    function deserialize<T>(
        value: ArrayBuffer | Uint8Array | string,
        type: T,
        options?: Partial<JsonOptions>
    ): MetaOrData<T> {
        const filledOptions = !!options ?
            optionsMemo.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataMemo.getOrAdd(type, (t) => meta.from(t)) :
            type

        let bytes: Uint8Array

        const isString = typeof value === 'string'
        if (isString) {
            const length = getMaxBytesCount(value.length)
            bytes = arrayPool.rent(length)
            filledOptions.encoder.encodeInto(value, bytes)
        }
        else if (value instanceof ArrayBuffer) {
            bytes = new Uint8Array(value)
        }
        else if (value instanceof Uint8Array) {
            bytes = value
        }
        else {
            throw new Error(`Invalid input type: expected string, ArrayBuffer, or Uint8Array, ` +
                `but received ${value === null ? 'null' : typeof value}`)
        }

        const result = metadata.toValue(metadata, {
            options: filledOptions,
            reader: {
                bytes,
                writable: false
            },
            stack: emptyStack,
        }, 0, 0)

        if (isString) {
            arrayPool.release(bytes)
        }

        if (isError(result)) {
            throw result.error
        }

        if (isNeedsMoreData(result)) {
            throw new Error(`Incomplete JSON: sync parser expects full data. ` +
                `In sync mode, data cannot be streamed - custom parser must receive complete data at once`)
        }

        return result.value
    }

    async function deserializeAsync<T>(
        json: ReadableStream<Uint8Array>,
        type: T,
        options?: Partial<JsonOptions>
    ): Promise<MetaOrData<T>> {
        const filledOptions = !!options ?
            optionsMemo.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
            defaultOptions

        const metadata = !isMetadata(type) ?
            metadataMemo.getOrAdd(type, (t) => meta.from(t)) :
            type

        const stack = new Stack<ParseState>()

        const tempBuffer = arrayPool.rent(65535)
        let tempBufferLength = 0
        let bufferLength = 0

        const reader = json.getReader()
        while (true) {
            const chunk = await reader.read()

            if (!chunk.value) { break }

            let buffer: Uint8Array

            if (tempBufferLength > 0) {
                buffer = arrayPool.rent(chunk.value.length + tempBufferLength)
                buffer.set(tempBuffer.subarray(0, tempBufferLength))
                buffer.set(chunk.value, tempBufferLength)
                bufferLength = chunk.value.length + tempBufferLength
            }
            else {
                buffer = chunk.value
                bufferLength = chunk.value.length
            }

            const result = metadata.toValue(metadata, {
                options: filledOptions,
                reader: {
                    bytes: buffer,
                    writable: !chunk.done
                },
                stack
            }, 0, 0)

            if (tempBufferLength > 0) {
                arrayPool.release(buffer)
            }

            if (chunk.done) { break }
            if (isNeedsMoreData(result)) {
                const data = buffer.subarray(result.nextIndex, bufferLength)
                tempBufferLength = data.length
                tempBuffer.set(data)
                continue
            }
            if (isError(result)) { throw result.error }

            return result.value
        }

        arrayPool.release(tempBuffer)

        throw new Error()
    }

    function serialize<T, M extends BaseMeta<T, any>>(value: T, metadata: M, options?: Partial<JsonOptions>): string {
        const fullOptions = !!options ?
            optionsMemo.getOrAdd(options, (key) => mergeOptions(defaultOptions, key)) :
            defaultOptions

        return metadata.toJson(metadata, value, fullOptions)
    }

    return {
        deserialize,
        deserializeAsync,
        serialize
    }
}

export const { deserialize, deserializeAsync, serialize } = jsont(defaultJsontOptions)