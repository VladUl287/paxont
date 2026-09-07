
# JSON Library

A type safe, high-performance, extendable JSON library with zero external dependencies.

## Features

- 🛡️ Type-safe – Full serialization/deserialization with JavaScript and TypeScript support
- 📡 Streaming – Process data incrementally as it arrives
- 🔧 Extendable – Flexible API for custom implementations
- 🏎️ Fast – Optimized for performance
- 🧰 Rich type support – Handles more types than native JSON (BigInt, Set, Map, Date, and more)
- 📦 Zero dependencies – No external packages required

## Usage/Examples

Just pass object filled with data as type and thats it.

```javascript
import { serialize, deserialize, deserializeAsync } from "json-t"

const type = {
    id: 1,
    name: "name",
    isActive: false,
    code_points: [65537, 32224]
}
const response = await fetch('url')

//deserialize from bytes buffer directly
const buffer = await (response.clone()).arrayBuffer()
const value = deserialize(buffer, type)
serialize(value, type)

//deserialize from bytes directly
const bytes = await (response.clone()).bytes()
const value = deserialize(bytes, type)
serialize(value, type)

//deserialize from string directly
const json = await (response.clone()).json()
const value = deserialize(json, type)
serialize(value, type)

//deserialize asynchronously from stream 
const reader = response.body
await deserializeAsync(reader, type)
serialize(value, type)
```

You can build your types flexible way.

```javascript
import { deserialize } from 'json-t'

// use object
const type = {
    id: 1,
    name: "name",
    createdAt: new Date(),
    isActive: false,
}
deserialize(json, type)

// use metadata
import { metadata } from 'json-t/src/metadata'
const { from } = metadata()
const type = from({
    id: 1,
    name: "name",
    createdAt: new Date(),
    isActive: false,
})
deserialize(json, type)

// use manually builded meta
import { bool, date, number, object, string } from 'json-t/src/metadata/builder'
const type = object({
    id: number(),
    name: string(),
    createdAt: date(),
    isActive: bool()
})
deserialize(json, type)
```


## Advanced Features

Supported Types

| Category | Types |
|----------|-------|
| Default | number, string, array, object, boolean |
| Numbers | int8, uint8, int16, uint16, int32, uint32, int64, uint64, bigint |
| Date | date object |
| Typed Arrays | Int8Array, Int16Array, Int32Array, BigInt64Array, Uint8Array, Uint16Array, Uint32Array, BigUint64Array, Float64Array |
| Collections | Set, Map(string as key type only for now) |
| Nullable | can be used for any type |

Type with all supported types.

```javascript
const type = {
    id: i32(), //int32
    status: i8(), //int8
    symbol: i16(), //int16
    number: i64(), //int64
    category: u8(), //uint8
    symbol_add: u16(), //uint16
    userId: u32(), //uint32
    hash: u64(), //uint64
    target: 123456789876543210n, //bigint
    name: "name",
    isActive: true,
    createdAt: new Date(),
    updatedAt: nullable(date()), //date or null
    bytes: new Uint8Array(),
    bytesUtf16Le: new Uint16Array(),
    postsIds: new Uint32Array(),
    ordersIds: new BigUint64Array(),
    tests: new Int8Array(),
    tests1: new Int16Array(),
    tests2: new Int32Array(),
    tests3: new BigInt64Array(),
    addresses: new Array(object({
        index: number(),
        name: string()
    })),
    coordinates: nullable(
        array(
            object({ x: number(), y: number() })
        )
    ),
    urls: new Map<string, number>([
        ["https://dummyimage.com", 0]
    ]),
    images: new Set(["https://image.com/jsonplaceholder.org"])
}
```

Add custom types
```javascript
import { metadata } from 'json-t/src/metadata'
import { Guid } from "guid-typescript"
import { ReadResultType } from 'json-t/src/utils/result'
const modifiedMetadata = metadata()
modifiedMetadata.add({
    name: 'guid',
    is: (value) => Guid.isGuid(value),
    from: (_v, _m) => {
        return {
            type: 'guid',
            toValue: (_meta, context) => {
                const { bytes, position, raw } = context.reader

                const start = position

                if (raw) { //if parsing from ascii string
                    const end = raw.indexOf('""', position)
                    const guid_string = raw.substring(start, end)
                    return {
                        type: ReadResultType.COMPLETE,
                        value: Guid.parse(guid_string),
                        nextIndex: end + 1
                    }
                }

                const end = bytes.indexOf(34, position) //34 - double quote(") in utf8

                const decoder = new TextDecoder()
                const guid_bytes = bytes.subarray(start, end)
                const guid_string = decoder.decode(guid_bytes)

                return {
                    type: ReadResultType.COMPLETE,
                    value: Guid.parse(guid_string),
                    nextIndex: end + 1
                }
            },
            toJson: (_meta, value, _options) => value.toJSON()
        }
    },
    order: 50
})
```

Then you can use modified metadata builder.

```javascript
import { deserialize } from 'json-t'

const type = modifiedMetadata.from({
    id: Guid.create(),
    isActive: false,
})

const response = await fetch('url')
const buffer = await response.arrayBuffer()

deserialize(buffer, type)
```

Use updated metadata builder with deserialize and serialize function itself

```javascript
import { jsont } from 'json-t'

const { deserialize } = jsont({
    metadata: modifiedMetadata
})

const type = {
    id: Guid.create(),
    isActive: false,
}

deserialize(buffer, type)
```

Pass custom options
## Roadmap

- Additional browser support

- Add more integrations

