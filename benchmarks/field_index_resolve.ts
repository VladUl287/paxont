import { add, complete, cycle, suite } from 'benny'
import { generateSwitchMatcher, generateSwitchMatcherLength, generateSwitchMatcherPack } from '../src/code_gen/field'

const encoder = new TextEncoder()

const small_unique_object = {
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
    "tags_count": 12
}

const mid_duplicates_object = {
    id: 15,
    order: 1244,
    phone: 343543534,
    phone1: 343543534,
    phone2: 343543534,
    phone3: 343543534,
    phone4: 343543534,
    phone5: 343543534,
    phone6: 343543534,
    phone7: 343543534,
    phone8: 343543534,
    phone9: 343543534,
    phone10: 343543534,
    phone11: 343543534,
    phone12: 343543534,
    phone13: 343543534,
}

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

const switchMathcer = generateSwitchMatcher(keys)
const switchMathcerLength = generateSwitchMatcherLength(keys)
const switchMathcerPack = generateSwitchMatcherPack(keys)

let keyToSearch = keys[5]

suite(
    'field_index_resolve',

    add('switchMathcer', () => switchMathcer(keyToSearch)),
    add('switchMathcerPack', () => switchMathcerPack(keyToSearch)),
    add('switchMathcerLength', () => switchMathcerLength(keyToSearch)),

    cycle(),
    complete(),
)
