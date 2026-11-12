/**
 * SocialParse – Core TypeScript Types
 *
 * These types are derived from the DATA_CONTRACT.md (spec version 1.0).
 * All field names follow snake_case as required by the contract.
 * Types are inferred from the Zod schemas in ../schemas/index.ts, so they are
 * always in sync. Do not maintain them separately here; re-export them instead.
 */

export type {
  Case,
  CaseDevice,
  EvidenceItem,
  AuditEvent,
  AuditEventType,
  AuditActor,
  AuditDetails,
} from '../schemas/index.ts';
