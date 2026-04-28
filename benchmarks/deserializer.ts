import { Bench } from 'tinybench'
import { toMetadata } from '../src/metadata/metadata'
import { deserialize } from '../src/json'
import { add, complete, cycle, suite } from 'benny'

const suiteTiny = new Bench({ name: 'deserialization', warmupIterations: 200 })

const obj = {
    id: 343543534,
    order: 343543534,
    phone: 343543534,
    phone1: 343543534,
    tags_count: 343543534,
    owner_id: 343543534,
    budget: 343543534,
    risk_level: 343543534,
    retry_count: 343543534,
    max_retries: 343543534,
    timeout_seconds: 343543534,
    storage_gb: 343543534,
    cpu_cores: 343543534,
    memory_mb: 343543534,
    rate_limit_rps: 343543534,
    data_retention_days: 343543534
}

const value = JSON.stringify(obj, null, 4)
const valueBytes = new TextEncoder().encode(value)
const metadata = toMetadata(obj)

suiteTiny
    .add('deserialize', () => deserialize(valueBytes, metadata))
    .add('JSON.parse', () => JSON.parse(value))

suiteTiny.run().then(() => {
    console.log(suiteTiny.name)
    console.table(suiteTiny.table())
})

suite(
    'deserialization',

    add('deserialize', () => deserialize(valueBytes, metadata)),
    add('JSON.parse', () => JSON.parse(value)),

    cycle((result) => {
        const nanoseconds = (1 / result.ops) * 1e9
        console.log(
            `${result.name}: ` +
            `${result.ops.toLocaleString()} ops/s, ` +
            `${nanoseconds.toFixed(2)} ns/op`
        )
    }),

    complete(),
)
