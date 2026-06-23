import { add, complete, cycle, suite } from 'benny'
import { generateTrieSwitch } from '../src/code_gen/field'

const encoder = new TextEncoder()

const big_unique_object = {
    "id": 1,
    "name": "Project Alpha",
    "active": true,
    "score": 99.5,
    "code": "ALPHA-001",
    "description": "This is a top-level project description without any nested structures inside.",
    "priority": "high",
    "created_at": "2025-01-15T10:30:00Z",
    "version": 3,
    "is_verified": false,
    "tags_count": 12,
    "owner_id": 42,
    "region": "EMEA",
    "budget": 250000,
    "currency": "USD",
    "risk_level": 0.75,
    "last_audit": "2025-03-20",
    "requires_approval": true,
    "team_size": 8,
    "repository_url": "https://github.com/example/alpha",
    "docs_version": "2.1.0",
    "license": "MIT",
    "compliance_status": "passed",
    "timezone": "Europe/London",
    "retry_count": 0,
    "max_retries": 5,
    "timeout_seconds": 30,
    "environment": "production",
    "log_level": "info",
    "backup_enabled": false,
    "storage_gb": 512,
    "cpu_cores": 4,
    "memory_mb": 8192,
    "endpoint": "https://api.example.com/v1/alpha",
    "ssl_verified": true,
    "rate_limit_rps": 1000,
    "auth_method": "oauth2",
    "service_account": "sa-alpha-prod",
    "notification_email": "alerts@example.com",
    "on_call_phone": "+1234567890",
    "sla_tier": "gold",
    "maintenance_window": "Sun 02:00-04:00",
    "data_retention_days": 90,
    "encryption_at_rest": true,
    "pii_present": false,
    "third_party_integrations": 3,
    "cost_center": "CC-8821",
    "department": "Engineering",
    "launch_date": "2024-11-01",
    "deprecated": false
}

const keys = Object.keys(big_unique_object).map(c => {
    return encoder.encode(c)
})

const switchMathcerWithoutPack = generateTrieSwitch(keys, { pack: false })
const switchMathcerPackWithPack = generateTrieSwitch(keys, { pack: true })

suite(
    'field_index_resolve',

    add('switchMathcerWithoutPack', () => {
        let result = 0
        for (let i = 0; i < keys.length; i++) {
            result += switchMathcerWithoutPack(keys[i], 0)
        }
        return result
    }),
    add('switchMathcerPackWithPack', () => {
        let result = 0
        for (let i = 0; i < keys.length; i++) {
            result += switchMathcerPackWithPack(keys[i], 0)
        }
        return result
    }),

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
