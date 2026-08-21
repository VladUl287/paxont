import { metadata } from "../../src/metadata"
import { bool, number, object } from "../../src/metadata/builder"
import { ObjectMeta, JsonParsingContext } from "../../src/metadata/types"
import { defaultOptions } from "../../src/options"
import { JSONParseError } from "../../src/utils/error"
import { JsonReader } from "../../src/utils/reader"
import { ReadResultType } from "../../src/utils/result"
import { Stack } from "../../src/utils/stack"
import { deserializePartially } from "./utils"

describe('toNullable', () => {
    const toBytes = (str: string) => new TextEncoder().encode(str)

    function expectObject(meta: ObjectMeta<any>, str: string) {
        const bytes = toBytes(str)
        const obj = JSON.parse(str)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)
        expect(result).toStrictEqual({
            type: ReadResultType.COMPLETE,
            value: obj,
            nextIndex: bytes.length
        })

        for (let i = 0; i < bytes.length; i++) {
            const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
            const result = deserializePartially(meta, chunks)

            try {
                expect(result).toStrictEqual({
                    type: ReadResultType.COMPLETE,
                    value: obj,
                    nextIndex: chunks[0].length
                })
            } catch (error) {
                console.log('error on: ', i)
                throw error
            }
        }
    }

    function expectError(meta: ObjectMeta<any>, str: string) {
        const bytes = toBytes(str)

        const context: JsonParsingContext = {
            reader: new JsonReader(bytes, bytes.length, false),
            options: defaultOptions,
            stack: new Stack()
        }

        const result = meta.toValue(meta, context, 0, 0)

        expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })

        for (let i = 0; i < bytes.length; i++) {
            try {
                const chunks = [bytes.slice(0, i), bytes.slice(i)].reverse()
                const result = deserializePartially(meta, chunks)
                expect(result).toStrictEqual({ type: ReadResultType.ERROR, error: expect.any(JSONParseError) })
            } catch (error) {
                console.log('error on: ', i)
                throw error
            }
        }
    }

    describe('basic parsing', () => {
        test('should parse simple object', () => {
            const input = { id: 1, isActive: false }
            const meta = object({
                id: number(),
                isActive: bool()
            })
            expectObject(meta, JSON.stringify(input))
        })

        test('should parse empty object', () => {
            const input = {}
            const meta = object({})
            expectObject(meta, JSON.stringify(input))
        })

        test('should parse big object', () => {
            const bigObject = {
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
            const meta = metadata().from(bigObject) as ObjectMeta<any>
            expectObject(meta, JSON.stringify(bigObject))
        })
    })

    describe('error handling', () => {
        test('should throw error if more data presented', () => {
            const meta = object({ id: number() })
            const input = { id: 1, isActive: false }
            expectError(meta, JSON.stringify(input))
        })

        test('should throw error if data not presented', () => {
            const input = { id: 1 }
            const meta = object({
                id: number(),
                isActive: bool()
            })
            expectError(meta, JSON.stringify(input))
        })

        test('should throw error on trailing comma', () => {
            const bigObject = {
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
            const meta = metadata().from(bigObject) as ObjectMeta<any>
            const json = JSON.stringify(bigObject).replace('}', ',}')
            expectError(meta, json)
        })

    })
})