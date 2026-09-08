
# JSON Library

Type-safe, high-performance, extensible JSON library with streaming support and zero dependencies.

## Features

- 🛡️ Type-safe – Full serialization/deserialization with JavaScript and TypeScript support
- 📡 Streaming – Process data incrementally as it arrives
- 🔧 Extendable – Flexible API for custom implementations
- 🏎️ Fast – Optimized for performance
- 🧰 Rich type support – Handles more types than native JSON (BigInt, Set, Map, Date, and more)
- 📦 Zero dependencies – No external packages required

## Usage/Examples

#### Defining Types with Metadata

You can define schemas for serialization/deserialization in multiple ways:

**1. Builder pattern**

```javascript
import { bool, date, number, object, string } from 'json-t/src/metadata/builder'
import { deserialize } from 'json-t'

const meta = object({
  id: number(),
  name: string(),
  createdAt: date(),
  isActive: bool()
})

deserialize(json, meta)
```

**2. From value inference**

```javascript
import { metadata } from 'json-t/src/metadata'
import { deserialize } from 'json-t'

const { from } = metadata()
const meta = from({
  id: 1,
  name: "name",
  createdAt: new Date(),
  isActive: false
})

deserialize(json, meta)
```

**3. Plain object (uses default metadata())**

```javascript
import { deserialize } from 'json-t'

const type = {
  id: 1,
  name: "name",
  createdAt: new Date(),
  isActive: false
}

deserialize(json, type)
```

**4. Mixed with metadata primitives**

```javascript
import { deserialize } from 'json-t'
import { i32, date } from 'json-t/src/metadata/builder'

const type = {
  id: i32(),
  name: "name",
  createdAt: date(),
  isActive: false
}

deserialize(json, type)
```

#### Deserialization

Parse JSON from strings, buffers, or streams:

```javascript
import { serialize, deserialize, deserializeAsync } from "json-t"

const type = {
    id: 1,
    name: "name",
    isActive: false
}
const response = await fetch('url')

//from bytes buffer
const buffer = await response.arrayBuffer()
const value = deserialize(buffer, type)

//from bytes
const bytes = await response.bytes()
const value = deserialize(bytes, type)

//from string
const json = await response.json()
const value = deserialize(json, type)

//from stream 
const reader = response.body
await deserializeAsync(reader, type)
```

#### Serialization

Convert typed objects to JSON strings:

```javascript
import { serialize } from 'json-t'
import { bool, number, object, string } from 'json-t/src/metadata/builder'

const type = object({
  id: number(),
  name: string(),
  createdAt: date(),
  isActive: bool()
})

const value = {
  id: 1,
  name: "name",
  createdAt: new Date(),
  isActive: false
}

const json = serialize(value, type)
```

## Advanced Features

Supported types.

| Category | Types |
|----------|-------|
| Default | number, string, array, object, boolean |
| Numbers | int8, uint8, int16, uint16, int32, uint32, int64, uint64, bigint |
| Date | date object |
| Typed Arrays | Int8Array, Int16Array, Int32Array, BigInt64Array, Uint8Array, Uint16Array, Uint32Array, BigUint64Array, Float64Array |
| Collections | Set, Map |
| Nullable | can be used for any type |

Scheme with all supported types:

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

### Modifiers

Modifiers change metadata behavior.

Custom serialization/deserialization logic:

```javascript
import { toJson, toValue } from "./metadata/modifiers"
const num = number(
    toJson((meta, value, options) => {
        throw new Error('number type not supported anymore')
    }),
    toValue((meta, context) => {
        return {
            type: ReadResultType.ERROR,
            error: new Error('number type not supported anymore')
        }
    })
)
```

Key selector for complex sets:

```javascript
import { number, object, set } from "./metadata/builder"
import { keySelector } from "./metadata/modifiers"

const setMeta = set(
    object({ id: number() }), 
    keySelector((value) => value.id)
)
```

Custom array pool (temp storage for deserialized values):

```javascript
import { pool } from "./metadata/modifiers"
const arrPool = arrayPool<Array<number>>({ ctor: Array })
const arr = array(number(), pool(arrPool))
```

### Custom types

Extend the library with your own types:

**1. Define the custom type:**

```javascript
import { metadata } from 'json-t/src/metadata'
import { Guid } from "guid-typescript"
import { ReadResultType } from 'json-t/src/utils/result'

const guid = (): PrimitiveMeta<Guid> => {
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
```

**2. Register the type(optional):**
```javascript
const customMetadata = metadata()
customMetadata.add({
    name: 'guid',
    is: (value) => Guid.isGuid(value),
    from: (_v, _m) => guid(),
    order: 50
})
```

**3. Use it:**

```javascript
// from type inference
const type = customMetadata.from({
  id: Guid.create(),
  isActive: false
})

// or from builder
const type = customMetadata.from({
  id: guid(),
  isActive: false
})

// or with jsont instance
import { jsont } from 'json-t'

const { deserialize } = jsont({
  metadata: customMetadata
})

const type = {
  id: Guid.create(),
  isActive: false
}

deserialize(buffer, type)
```

## API Reference

#### `deserialize(value, type, options?)`

Synchronously parses JSON data from various input formats into a typed object using the provided schema.

**Parameters:**

| Parameter | Type | Description |
| :-------- | :--- | :---------- |
| `value` | `ArrayBuffer` \| `Uint8Array` \| `string` | **Required.** The raw JSON data to parse |
| `type` | `T` | **Required.** The schema or type definition for parsing and validation |
| `options` | `Partial<JsonOptions>` | Optional. Override default serialization options |

**Returns:** `T` - The parsed object with the specified type

---

#### `deserializeAsync(value, type, options?)`

Asynchronously parses streaming JSON data into a typed object, enabling memory-efficient processing of large payloads.

**Parameters:**

| Parameter | Type | Description |
| :-------- | :--- | :---------- |
| `json` | `ReadableStream<Uint8Array>` | **Required.** The readable stream of JSON data chunks |
| `type` | `T` | **Required.** The schema or type definition for parsing and validation |
| `options` | `Partial<JsonOptions>` | Optional. Override default serialization options |

**Returns:** `Promise<T>` - A promise that resolves to the parsed object with the specified type

---

#### `serialize(value, type, options?)`

Serializes a typed object into a JSON string.

**Parameters:**

| Parameter | Type | Description |
| :-------- | :--- | :---------- |
| `value` | `V` | **Required.** The object value to serialize |
| `type` | `T` | **Required.** The schema or type definition that describes the object structure |
| `options` | `Partial<JsonOptions>` | Optional. Override default serialization options |

**Returns:** `string` - The JSON string representation of the object

#### `jsont(options?)`

Creates a JSON serializer/deserializer instance with customizable behavior.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | `Partial<JsontOptions>` | `defaultJsontOptions` | Configuration options for serialization behavior |

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `deserialize` | `<T>(value: ArrayBuffer \| Uint8Array \| string, type: T, options?) => T` | Synchronously parses JSON into typed objects |
| `deserializeAsync` | `<T>(json: ReadableStream<Uint8Array>, type: T, options?) => Promise<T>` | Asynchronously parses streaming JSON data |
| `serialize` | `<V, T>(value: V, type: T, options?) => string` | Serializes typed objects to JSON strings |

**Example:**
```typescript
const json = json({
  metadata: customMetadata,
  bufferPool: customPool
})
```

## Roadmap

- [ ] Float16 and Float32 support
- [ ] DeserializeArray generator and iterator
- [ ] Custom date formats with configurable specifiers
- [ ] Extended JSON serialization/deserialization options:
  - Allow duplicate properties
  - Case-insensitive field matching
  - Trailing comma support
  - Formatted serializer
- [ ] Optional type support
- [ ] Any type implementation
- [ ] Circular reference detection
- [ ] Make string decoder accept fatal flag
- [ ] Make string decoder accept encodings
- [ ] Allow meta builders to accept objects
- [ ] Reduce memory usage
- [ ] Optimize speed performance

