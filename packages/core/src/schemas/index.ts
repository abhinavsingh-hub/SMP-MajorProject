/**
 * SocialParse – Zod Validation Schemas
 *
 * Source of truth: docs/DATA_CONTRACT.md (spec version 1.0)
 *
 * Three top-level entities are validated here:
 *   - Case          (case.json)
 *   - EvidenceItem  (one element of manifest.json → items[])
 *   - AuditEvent    (one line of audit_log.jsonl)
 *
 * TypeScript types are inferred from the schemas with z.infer<> so there is
 * only one definition to maintain.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives (re-used across schemas)
// ---------------------------------------------------------------------------

/**
 * ISO 8601 UTC timestamp with exactly three millisecond digits and a trailing Z.
 * Format: YYYY-MM-DDTHH:MM:SS.sssZ  (e.g. "2026-11-12T09:31:58.311Z")
 *
 * Rules from DATA_CONTRACT.md §2.1:
 *   - Must end with Z (UTC only – offsets like +05:30 are rejected)
 *   - Must have milliseconds (.sss)
 *   - Must represent a valid calendar date and time
 */
const utcTimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    'Timestamp must be ISO 8601 UTC with milliseconds, e.g. "2026-11-12T09:31:58.311Z"',
  )
  .refine(
    (val) => {
      const d = new Date(val);
      return !isNaN(d.getTime());
    },
    { message: 'Timestamp must be a valid date-time value' },
  );

/**
 * SHA-256 hash: exactly 64 lowercase hexadecimal characters (0-9, a-f).
 * DATA_CONTRACT.md §2.2
 */
const sha256Schema = z
  .string()
  .regex(
    /^[0-9a-f]{64}$/,
    'SHA-256 hash must be exactly 64 lowercase hexadecimal characters',
  );

/**
 * Case ID: CASE-YYYY-NNNN  (DATA_CONTRACT.md §2.3)
 */
const caseIdSchema = z
  .string()
  .regex(/^CASE-\d{4}-\d{4}$/, 'Case ID must follow the format CASE-YYYY-NNNN');

/**
 * Item ID: ITEM-NNNN  (DATA_CONTRACT.md §2.3 / §5.3)
 * The number is at least 4 digits (can grow beyond 9999 per §3.3 rule 5).
 */
const itemIdSchema = z
  .string()
  .regex(/^ITEM-\d{4,}$/, 'Item ID must follow the format ITEM-NNNN');

/**
 * Platform ID: lowercase letters and digits only (DATA_CONTRACT.md §2.3).
 * The contract lists instagram, facebook, x but allows more via agreement.
 */
const platformSchema = z
  .string()
  .regex(
    /^[a-z0-9]+$/,
    'Platform ID must contain only lowercase letters and digits',
  )
  .min(1, 'Platform ID must not be empty');

/**
 * Section ID: lowercase letters, digits and underscores only (DATA_CONTRACT.md §2.3).
 */
const sectionSchema = z
  .string()
  .regex(
    /^[a-z0-9_]+$/,
    'Section ID must contain only lowercase letters, digits and underscores',
  )
  .min(1, 'Section ID must not be empty');

/**
 * A non-empty string (used for required free-text fields such as case_number).
 */
const nonEmptyStringSchema = z.string().min(1, 'Field must not be empty');

// ---------------------------------------------------------------------------
// CaseSchema  –  represents case.json  (DATA_CONTRACT.md §4)
// ---------------------------------------------------------------------------

/**
 * Device sub-object inside case.json (DATA_CONTRACT.md §4.2).
 */
export const CaseDeviceSchema = z.object({
  /** "desktop" or "android" */
  type: z.enum(['desktop', 'android']),
  /** Name of the device (computer name or phone model) */
  name: nonEmptyStringSchema,
  /** Operating system name, e.g. "macOS" */
  os: nonEmptyStringSchema,
  /** Operating system version */
  os_version: nonEmptyStringSchema,
  /** Version of the SocialParse app that created the case */
  app_version: nonEmptyStringSchema,
});

export type CaseDevice = z.infer<typeof CaseDeviceSchema>;

/**
 * Validates the full contents of case.json (DATA_CONTRACT.md §4).
 */
export const CaseSchema = z.object({
  /** Always "1.0" for this spec version */
  schema_version: z.literal('1.0'),
  /** System ID of the case, format CASE-YYYY-NNNN */
  case_id: caseIdSchema,
  /** Official case or FIR number – free text, never empty */
  case_number: nonEmptyStringSchema,
  /** Full name of the examiner */
  examiner_name: nonEmptyStringSchema,
  /** Rank or job title of the examiner */
  examiner_designation: nonEmptyStringSchema,
  /** Name of the accused person */
  accused_name: nonEmptyStringSchema,
  /** Name of the agency or unit */
  agency: nonEmptyStringSchema,
  /** When the case was created (ISO 8601 UTC) */
  created_at: utcTimestampSchema,
  /** Device information */
  device: CaseDeviceSchema,
  /**
   * Free-text notes.
   * Per DATA_CONTRACT.md §2.6: use "" when there is nothing to write.
   * This field is therefore a string (not nullable), and can be empty.
   */
  remarks: z.string(),
});

export type Case = z.infer<typeof CaseSchema>;

// ---------------------------------------------------------------------------
// EvidenceItemSchema  –  one item inside manifest.json  (DATA_CONTRACT.md §5)
// ---------------------------------------------------------------------------

/**
 * Validates one element of the `items` array in manifest.json (DATA_CONTRACT.md §5.3).
 * The same shape is also used as the payload of the `item` WebSocket message.
 */
export const EvidenceItemSchema = z.object({
  /** ITEM-NNNN, unique inside the case */
  item_id: itemIdSchema,
  /** Platform ID (DATA_CONTRACT.md §2.7) */
  platform: platformSchema,
  /** Section ID (DATA_CONTRACT.md §2.7) */
  section: sectionSchema,
  /** Path of the screenshot, relative to the case folder, using "/" */
  file_path: nonEmptyStringSchema,
  /** Size of the file in bytes (non-negative integer) */
  file_size_bytes: z.number().int().nonnegative(),
  /** SHA-256 hash of the file (DATA_CONTRACT.md §2.2) */
  sha256: sha256Schema,
  /** When the screenshot was taken (ISO 8601 UTC) */
  captured_at: utcTimestampSchema,
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ---------------------------------------------------------------------------
// AuditEventSchema  –  one line of audit_log.jsonl  (DATA_CONTRACT.md §7)
// ---------------------------------------------------------------------------

/**
 * Who caused the event (DATA_CONTRACT.md §7.3).
 */
export const AuditActorSchema = z.enum([
  'examiner',
  'desktop_app',
  'capture_worker',
  'android_app',
]);

export type AuditActor = z.infer<typeof AuditActorSchema>;

/**
 * The event_type values defined in DATA_CONTRACT.md §7.3.
 */
export const AuditEventTypeSchema = z.enum([
  'case_created',
  'capture_started',
  'user_action_required',
  'capture_resumed',
  'item_captured',
  'item_rejected',
  'capture_warning',
  'capture_error',
  'capture_finished',
  'integrity_check',
]);

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

/**
 * The `details` object is event-type-specific. Per DATA_CONTRACT.md §2.6,
 * readers must ignore unknown fields. We therefore accept any object for
 * `details` but require it to be a plain object (not null, not an array).
 *
 * Specific detail shapes are validated by the desktop app when it reads each
 * event; a broader type here keeps the schema flexible across all event types
 * without duplicating per-event sub-schemas in P3-03.
 */
const auditDetailsSchema = z.record(z.string(), z.unknown());

export type AuditDetails = z.infer<typeof auditDetailsSchema>;

/**
 * Validates one line of audit_log.jsonl (DATA_CONTRACT.md §7.3).
 *
 * Hash-chain fields:
 *   - prev_hash: SHA-256 of the previous line, or 64 zeros for the first line.
 *   - event_hash: SHA-256 of this line (without the event_hash field itself).
 */
export const AuditEventSchema = z.object({
  /** Event sequence number starting at 1, no gaps */
  seq: z.number().int().positive(),
  /** When the event happened (ISO 8601 UTC) */
  timestamp: utcTimestampSchema,
  /** Who caused the event */
  actor: AuditActorSchema,
  /** What happened */
  event_type: AuditEventTypeSchema,
  /** Extra facts about the event – shape depends on event_type */
  details: auditDetailsSchema,
  /**
   * SHA-256 of the previous audit line.
   * For the very first line this is 64 zeros ("0000...0000").
   * We accept either a valid SHA-256 or the all-zeros sentinel.
   */
  prev_hash: z.union([
    sha256Schema,
    z.literal('0000000000000000000000000000000000000000000000000000000000000000'),
  ]),
  /** SHA-256 of this line (calculated per DATA_CONTRACT.md §7.4) */
  event_hash: sha256Schema,
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

