/**
 * @smp/core – public entry point
 *
 * Re-exports everything that other packages in this monorepo need.
 * Only add exports here when they are ready for external use.
 */

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
