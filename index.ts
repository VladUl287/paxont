import { deserialize } from "./src/json"
import { toMetadata } from "./src/metadata/metadata"

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

const metadata = toMetadata(obj)

const value = JSON.stringify(obj, null, 8)

const deserialized = deserialize(new TextEncoder().encode(value), metadata)

console.log(deserialized)