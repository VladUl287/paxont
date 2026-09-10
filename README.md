
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

#### Deserialization

Parse JSON from strings, buffers, or streams:

```javascript
import { serialize, deserialize, deserializeAsync } from "paxont"

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
const json = await response.text()
const value = deserialize(json, type)

//from stream 
const reader = response.body
await deserializeAsync(reader, type)
```

#### Serialization

Convert typed objects to JSON strings:

```javascript
import { serialize } from 'paxont'
import { bool, number, object, string } from 'paxont/metadata/builder'

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

#### Defining Types with Metadata

You can define schemas for serialization/deserialization in multiple ways:

**1. Builder pattern**

```javascript
import { bool, date, number, object, string } from 'paxont/metadata/builder'
import { deserialize } from 'paxont'

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
import { metadata } from 'paxont/metadata'
import { deserialize } from 'paxont'

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
import { deserialize } from 'paxont'

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
import { deserialize } from 'paxont'
import { i32, date } from 'paxont/metadata/builder'

const type = {
  id: i32(),
  name: "name",
  createdAt: date(),
  isActive: false
}

deserialize(json, type)
```

## Advanced Features

Supported types.

| Category | Types |
|----------|-------|
| Default | number, string, array, object, boolean |
| Numbers | int8, uint8, int16, uint16, int32, uint32, int64, uint64, bigint |
| Date | date object(can be parsed from string or timestamp) |
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
import { toJson, toValue } from "paxont/metadata/modifiers"
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
import { number, object, set } from "paxont/metadata/builder"
import { keySelector } from "paxont/metadata/modifiers"

const setMeta = set(
    object({ id: number() }), 
    keySelector((value) => value.id)
)
```

Custom array pool (temp storage for deserialized values):

```javascript
import { pool } from "paxont/metadata/modifiers"
const arrPool = arrayPool<Array<number>>({ ctor: Array })
const arr = array(number(), pool(arrPool))
```

### Custom types

Extend the library with your own types:

**1. Define the custom type:**

```javascript
import { metadata } from 'paxont/metadata'
import { Guid } from "guid-typescript"
import { ReadResultType } from 'paxont/utils/result'

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
import { jsont } from 'paxont'

const { deserialize } = jsont({
  metadata: customMetadata
})

const type = {
  id: Guid.create(),
  isActive: false
}

deserialize(buffer, type)
```

## Roadmap

- Fix v8 pre-tenuring memory problem on many literal objects allocation
- Float16 and Float32 support
- DeserializeArray generator and iterator
- Custom date formats with configurable specifiers
- Extended JSON serialization/deserialization options:
  - Allow duplicate properties
  - Case-insensitive field matching
  - Trailing comma support
  - Formatted serializer
- Optional type support
- Any type implementation
- Circular reference detection
- Make string decoder accept fatal flag
- Make string decoder accept encodings
- Allow meta builders to accept objects
- More modifiers for all types
- Reduce memory usage
- Optimize speed performance

