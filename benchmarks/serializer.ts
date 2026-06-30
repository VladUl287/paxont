import { serialize } from '../src/json'
import { add, complete, cycle, suite } from 'benny'
import { field, number, object } from '../src/metadata/builder'

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

const meta = object(
    field('id', number()),
    field('order', number()),
    field('phone', number()),
    field('phone1', number()),
    field('tags_count', number()),
    field('owner_id', number()),
    field('budget', number()),
    field('risk_level', number()),
    field('retry_count', number()),
    field('max_retries', number()),
    field('timeout_seconds', number()),
    field('storage_gb', number()),
    field('cpu_cores', number()),
    field('memory_mb', number()),
    field('rate_limit_rps', number()),
    field('data_retention_days', number()),
)

suite(
    'deserialization',

    add('serailize', () => serialize(obj, meta)),
    add('JSON.stringify', () => JSON.stringify(obj)),

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
