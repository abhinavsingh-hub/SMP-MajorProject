/**
 * @smp/core – public entry point
 *
 * Re-exports everything that other packages in this monorepo need.
 * Only add exports here when they are ready for external use.
 */

// ---------------------------------------------------------------------------
// P3-03: Zod schemas and inferred types
// ---------------------------------------------------------------------------

// Zod schemas
export {
  CaseDeviceSchema,
  CaseSchema,
  EvidenceItemSchema,
  AuditActorSchema,
  AuditEventTypeSchema,
  AuditEventSchema,
} from './schemas/index.ts';

// TypeScript types (inferred from schemas – no duplicate maintenance)
export type {
  CaseDevice,
  Case,
  EvidenceItem,
  AuditActor,
  AuditEventType,
  AuditDetails,
  AuditEvent,
} from './schemas/index.ts';

// ---------------------------------------------------------------------------
// P3-04: FileSystem interface, path helpers, case builder
// ---------------------------------------------------------------------------

// FileSystem interface and types
export type { FileSystem, DirEntry, WriteOptions } from './fs/interface.ts';

// Path helpers
export {
  CASE_JSON,
  MANIFEST_JSON,
  HASHES_CSV,
  AUDIT_LOG_JSONL,
  HASHES_CSV_HEADER,
  caseRootPath,
  caseJsonPath,
  manifestJsonPath,
  hashesCsvPath,
  auditLogPath,
  evidenceDirPath,
} from './fs/paths.ts';

// Node.js FileSystem implementation (desktop / testing only)
export { NodeFileSystem, nodeSha256 } from './fs/node-fs.ts';

// Audit-log hash-chain utilities
export {
  canonicalJson,
  hashAuditEvent,
  appendAudit,
  readAuditLog,
  verifyAuditChain,
  ZERO_HASH,
} from './case/audit.ts';
export type {
  AuditEventInput,
  HashedAuditEvent,
  AppendAuditInput,
  AuditVerificationResult,
  Sha256Fn,
} from './case/audit.ts';

// Case folder builder
export { createCaseFolder } from './case/create.ts';
export type { CreateCaseInput, CreateCaseResult } from './case/create.ts';

// ---------------------------------------------------------------------------
// P3-05: Evidence recorder & hashing
// ---------------------------------------------------------------------------
export { recordScreenshot, compactUtcTimestamp } from './case/record.ts';
export type { RecordScreenshotInput } from './case/record.ts';
