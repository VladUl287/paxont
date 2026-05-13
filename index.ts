import { parseNumberF64 } from "./src/converters/number"
import { deserialize } from "./src/json"
import { toMetadata } from "./src/metadata/metadata"

const bytes = new TextEncoder().encode("3333567891")

let val: any = 0n
for (let i = 0; i < 8; i++) {
    val |= BigInt(bytes[i]) << BigInt(i * 8)
}
console.log(val, val.toString(16))

val -= 0x3030303030303030n
console.log(val, val.toString(16))

val = (val * 10n) + (val >> 8n)
console.log(val, val.toString(16))

const mask = 0x000000FF000000FFn;
const mul1 = 0x000F424000000064n; // 100 + (1000000 << 32)
const mul2 = 0x0000271000000001n; // 1 + (10000 << 32)

console.log((val & mask), (val & mask).toString(16))

val = (val & mask) * mul1 + ((val >> 16n) & mask) * mul2 >> 32n
console.log(val, val.toString(16))

val = BigInt.asUintN(32, val)
console.log(val, val.toString(16))
console.log('-----------------------------')

const i = 0
const
    a = bytes[i],
    b = bytes[i + 1],
    c = bytes[i + 2],
    d = bytes[i + 3]
val = (a | b << 8 | c << 16 | d << 24) >>> 0
console.log(val, val.toString(16))

val -= 0x30303030
console.log(val, val.toString(16))

val = (val * 10) + (val >> 8)
console.log(val, val.toString(16))

// val = (val & 0x00FF00FF)
// val = (val & 0xFF00FF00)
// val = (val & 0x0000FFFF)
// // val = (val & 0xFFFF0000)
// console.log(val, val.toString(16))

const mask1 = 0x0000FFFF

console.log((val & mask1), (val & mask1).toString(16))
console.log(((val >> 16) & mask1), ((val >> 16) & mask1).toString(16))

const mul11 = 0x0064  // 100 (10^2)
const mul21 = 0x0001  // 1 (10^0)

val = (((val & mask1) * mul11) + ((val >> 16) & mask1) * mul21)
console.log(val >>> 0, val.toString(16))
console.log(val.toString(2), val.toString(2).length)
console.log((3333).toString(2), (3333).toString(2).length)

// console.log(parseNumberF64(integerSlowpath, 0))

// const buffer = new ArrayBuffer(8)
// const conversionU32 = new Uint32Array(buffer)
// const conversionU64 = new BigUint64Array(buffer)
// const integerSlowpath = new TextEncoder().encode("1234567891234567891")
// integerSlowpath.map(c => c - 48).forEach(digit => {
//     const high = conversionU32[1]
//     const low = conversionU32[0]
//     const newLow = low * 10 + digit
//     const carry = Math.floor(newLow / 0x100000000)
//     conversionU32[0] = newLow >>> 0
//     conversionU32[1] = high * 10 + carry
// })
// console.log(conversionU64[0])

// const obj = {
//     id: 343543534,
//     order: 343543534,
//     phone: 343543534,
//     phone1: 343543534,
//     tags_count: 343543534,
//     owner_id: 343543534,
//     budget: 343543534,
//     risk_level: 343543534,
//     retry_count: 343543534,
//     max_retries: 343543534,
//     timeout_seconds: 343543534,
//     storage_gb: 343543534,
//     cpu_cores: 343543534,
//     memory_mb: 343543534,
//     rate_limit_rps: 343543534,
//     data_retention_days: 343543534
// }

// const metadata = toMetadata(obj)

// const value = JSON.stringify(obj, null, 4)

// const deserialized = deserialize(new TextEncoder().encode(value), metadata)

// console.log(deserialized)