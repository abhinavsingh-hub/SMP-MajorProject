/**
 * Unit tests for packages/core Zod schemas.
 *
 * Framework: Node.js built-in test runner (node:test + node:assert)
 * Run with:  node --experimental-strip-types --test tests/**\/*.test.ts
 *
 * Coverage:
 *   - CaseSchema        (case.json)
 *   - EvidenceItemSchema (manifest.json item)
 *   - AuditEventSchema  (audit_log.jsonl line)
 *
 * Each schema has tests for:
 *   ✅ A fully-valid example (must pass)
 *   ❌ Missing required fields (must fail)
 *   ❌ Incorrect data types (must fail)
 *   ❌ Empty required strings (must fail)
 *   ❌ Invalid timestamps (must fail)
 *   ❌ Timestamps without UTC / with offset (must fail)
 *   ❌ Invalid platform values (must fail)
 *   ❌ Invalid hash formats (must fail)
 *   ❌ Incorrect optional-ish field values (must fail)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CaseSchema,
  EvidenceItemSchema,
  AuditEventSchema,
} from '../src/schemas/index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert that parsing succeeds and the returned data equals the input. */
function expectValid<T>(schema: { parse: (v: unknown) => T }, input: unknown): T {
  return schema.parse(input); // throws ZodError on failure
}

/** Assert that parsing fails (ZodError is thrown). */
function expectInvalid(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  input: unknown,
  hint?: string,
): void {
  const result = schema.safeParse(input);
  assert.equal(
    result.success,
    false,
    hint ?? 'Expected validation to fail but it succeeded',
  );
}

/** Remove a key from an object – used to test missing-field validation. */
function omitKey<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

// ---------------------------------------------------------------------------
// Shared valid fixtures (taken from DATA_CONTRACT.md examples)
// ---------------------------------------------------------------------------

const VALID_CASE = {
  schema_version: '1.0',
  case_id: 'CASE-2026-0042',
  case_number: 'CCU/FIR/118/2026',
  examiner_name: 'Priya Deshmukh',
  examiner_designation: 'Sub-Inspector',
  accused_name: 'Sample Accused',
  agency: 'Example Cyber Crime Unit',
  created_at: '2026-11-12T09:15:02.118Z',
  device: {
    type: 'desktop',
    name: 'EXAMINER-MAC-01',
    os: 'macOS',
    os_version: '14.5',
    app_version: '0.1.0',
  },
  remarks: 'Sample case used for documentation only.',
};

const VALID_EVIDENCE_ITEM = {
  item_id: 'ITEM-0001',
  platform: 'instagram',
  section: 'profile',
  file_path:
    'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png',
  file_size_bytes: 482113,
  sha256:
    'db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376',
  captured_at: '2026-11-12T09:31:58.311Z',
};

const VALID_AUDIT_EVENT = {
  seq: 1,
  timestamp: '2026-11-12T09:15:02.118Z',
  actor: 'examiner',
  event_type: 'case_created',
  details: {
    case_number: 'CCU/FIR/118/2026',
    examiner_name: 'Priya Deshmukh',
  },
  prev_hash:
    '0000000000000000000000000000000000000000000000000000000000000000',
  event_hash:
    '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb',
};

// ---------------------------------------------------------------------------
// CaseSchema tests
// ---------------------------------------------------------------------------

describe('CaseSchema', () => {
  it('accepts a valid Case object', () => {
    const result = expectValid(CaseSchema, VALID_CASE);
    assert.equal(result.case_id, 'CASE-2026-0042');
    assert.equal(result.schema_version, '1.0');
    assert.equal(result.device.type, 'desktop');
  });

  it('accepts empty string for remarks (DATA_CONTRACT §2.6)', () => {
    expectValid(CaseSchema, { ...VALID_CASE, remarks: '' });
  });

  // --- Missing required fields ---

  it('rejects when schema_version is missing', () => {
    expectInvalid(CaseSchema, omitKey(VALID_CASE, 'schema_version'), 'schema_version is required');
  });

  it('rejects when case_id is missing', () => {
    expectInvalid(CaseSchema, omitKey(VALID_CASE, 'case_id'), 'case_id is required');
  });

  it('rejects when created_at is missing', () => {
    expectInvalid(CaseSchema, omitKey(VALID_CASE, 'created_at'), 'created_at is required');
  });

  it('rejects when device is missing', () => {
    expectInvalid(CaseSchema, omitKey(VALID_CASE, 'device'), 'device is required');
  });

  it('rejects when remarks is missing', () => {
    expectInvalid(CaseSchema, omitKey(VALID_CASE, 'remarks'), 'remarks is required');
  });

  // --- Wrong schema_version ---

  it('rejects schema_version other than "1.0"', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, schema_version: '2.0' },
      'schema_version must be "1.0"',
    );
  });

  // --- case_id format ---

  it('rejects case_id with wrong format (lowercase)', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, case_id: 'case-2026-0042' },
      'case_id must be uppercase CASE-YYYY-NNNN',
    );
  });

  it('rejects case_id with too few digits', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, case_id: 'CASE-2026-42' },
      'case_id number must be 4 digits',
    );
  });

  it('rejects case_id as a number', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, case_id: 42 },
      'case_id must be a string',
    );
  });

  // --- Empty required strings ---

  it('rejects empty case_number', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, case_number: '' },
      'case_number must not be empty',
    );
  });

  it('rejects empty examiner_name', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, examiner_name: '' },
      'examiner_name must not be empty',
    );
  });

  it('rejects empty agency', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, agency: '' },
      'agency must not be empty',
    );
  });

  // --- Timestamps ---

  it('rejects created_at without milliseconds', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, created_at: '2026-11-12T09:15:02Z' },
      'timestamp without milliseconds must be rejected',
    );
  });

  it('rejects created_at with UTC offset instead of Z', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, created_at: '2026-11-12T09:15:02.118+05:30' },
      'timestamp with +05:30 offset must be rejected',
    );
  });

  it('rejects created_at as a plain date string', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, created_at: '2026-11-12' },
      'date-only string must be rejected',
    );
  });

  it('rejects created_at with an invalid calendar date', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, created_at: '2026-13-99T25:99:99.000Z' },
      'invalid calendar date must be rejected',
    );
  });

  it('rejects created_at as a number', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, created_at: 1699782902118 },
      'timestamp must be a string',
    );
  });

  // --- Device sub-object ---

  it('rejects device.type other than desktop or android', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, device: { ...VALID_CASE.device, type: 'laptop' } },
      'device.type must be desktop or android',
    );
  });

  it('rejects empty device.name', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, device: { ...VALID_CASE.device, name: '' } },
      'device.name must not be empty',
    );
  });

  it('rejects remarks as null (must be string per §2.6)', () => {
    expectInvalid(
      CaseSchema,
      { ...VALID_CASE, remarks: null },
      'remarks must be a string',
    );
  });
});

// ---------------------------------------------------------------------------
// EvidenceItemSchema tests
// ---------------------------------------------------------------------------

describe('EvidenceItemSchema', () => {
  it('accepts a valid EvidenceItem', () => {
    const result = expectValid(EvidenceItemSchema, VALID_EVIDENCE_ITEM);
    assert.equal(result.item_id, 'ITEM-0001');
    assert.equal(result.platform, 'instagram');
    assert.equal(result.file_size_bytes, 482113);
  });

  it('accepts item_id with more than 4 digits (DATA_CONTRACT §3.3 rule 5)', () => {
    expectValid(EvidenceItemSchema, {
      ...VALID_EVIDENCE_ITEM,
      item_id: 'ITEM-10000',
    });
  });

  // --- Missing required fields ---

  it('rejects when item_id is missing', () => {
    expectInvalid(EvidenceItemSchema, omitKey(VALID_EVIDENCE_ITEM, 'item_id'), 'item_id is required');
  });

  it('rejects when sha256 is missing', () => {
    expectInvalid(EvidenceItemSchema, omitKey(VALID_EVIDENCE_ITEM, 'sha256'), 'sha256 is required');
  });

  it('rejects when captured_at is missing', () => {
    expectInvalid(EvidenceItemSchema, omitKey(VALID_EVIDENCE_ITEM, 'captured_at'), 'captured_at is required');
  });

  // --- item_id format ---

  it('rejects item_id with wrong prefix', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, item_id: 'EVIDENCE-0001' },
      'item_id must start with ITEM-',
    );
  });

  it('rejects item_id with fewer than 4 digits', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, item_id: 'ITEM-001' },
      'item_id number must have at least 4 digits',
    );
  });

  // --- Platform ---

  it('rejects platform with uppercase letters', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, platform: 'Instagram' },
      'platform must be lowercase',
    );
  });

  it('rejects platform with spaces', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, platform: 'my platform' },
      'platform must not contain spaces',
    );
  });

  it('rejects empty platform string', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, platform: '' },
      'platform must not be empty',
    );
  });

  // --- Section ---

  it('rejects section with uppercase letters', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, section: 'Profile' },
      'section must be lowercase',
    );
  });

  it('rejects empty section string', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, section: '' },
      'section must not be empty',
    );
  });

  // --- file_path ---

  it('rejects empty file_path', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, file_path: '' },
      'file_path must not be empty',
    );
  });

  // --- file_size_bytes ---

  it('rejects file_size_bytes as a string', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, file_size_bytes: '482113' },
      'file_size_bytes must be a number',
    );
  });

  it('rejects file_size_bytes as a float', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, file_size_bytes: 482113.5 },
      'file_size_bytes must be an integer',
    );
  });

  it('rejects negative file_size_bytes', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, file_size_bytes: -1 },
      'file_size_bytes must be non-negative',
    );
  });

  // --- SHA-256 hash ---

  it('rejects sha256 that is too short (63 chars)', () => {
    expectInvalid(
      EvidenceItemSchema,
      {
        ...VALID_EVIDENCE_ITEM,
        sha256: 'db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c037',
      },
      'sha256 must be exactly 64 hex chars',
    );
  });

  it('rejects sha256 with uppercase characters', () => {
    expectInvalid(
      EvidenceItemSchema,
      {
        ...VALID_EVIDENCE_ITEM,
        sha256: 'DB6E4F3EA63C2586FAA75A9DE1380911542718CB398D66473BA66E7FA78C0376',
      },
      'sha256 must be lowercase',
    );
  });

  it('rejects sha256 with non-hex characters', () => {
    expectInvalid(
      EvidenceItemSchema,
      {
        ...VALID_EVIDENCE_ITEM,
        sha256: 'zb6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376',
      },
      'sha256 must only contain hex characters',
    );
  });

  // --- Timestamps ---

  it('rejects captured_at without milliseconds', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, captured_at: '2026-11-12T09:31:58Z' },
      'timestamp without milliseconds must be rejected',
    );
  });

  it('rejects captured_at with UTC offset', () => {
    expectInvalid(
      EvidenceItemSchema,
      {
        ...VALID_EVIDENCE_ITEM,
        captured_at: '2026-11-12T09:31:58.311+05:30',
      },
      'timestamp with offset must be rejected',
    );
  });

  it('rejects captured_at with invalid date', () => {
    expectInvalid(
      EvidenceItemSchema,
      { ...VALID_EVIDENCE_ITEM, captured_at: '2026-99-99T99:99:99.999Z' },
      'invalid calendar date must be rejected',
    );
  });
});

// ---------------------------------------------------------------------------
// AuditEventSchema tests
// ---------------------------------------------------------------------------

describe('AuditEventSchema', () => {
  it('accepts a valid AuditEvent (line 1 from DATA_CONTRACT §7.5)', () => {
    const result = expectValid(AuditEventSchema, VALID_AUDIT_EVENT);
    assert.equal(result.seq, 1);
    assert.equal(result.actor, 'examiner');
    assert.equal(result.event_type, 'case_created');
  });

  it('accepts prev_hash as a real SHA-256 (line 2+)', () => {
    expectValid(AuditEventSchema, {
      ...VALID_AUDIT_EVENT,
      seq: 2,
      prev_hash:
        '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb',
      event_hash:
        'e8ef56c2ed865f31bcffe78f1c119dd5b030a2fca5dcad44e08b7f2b038b3572',
    });
  });

  it('accepts details with nested objects (integrity_check example)', () => {
    expectValid(AuditEventSchema, {
      ...VALID_AUDIT_EVENT,
      seq: 12,
      actor: 'desktop_app',
      event_type: 'integrity_check',
      details: { result: 'pass', items_checked: 4, issues: [] },
      prev_hash:
        'eb27cd43fcb1d1da2f96330a33bce7e6096f7dc39612331d0e34707e480a499b',
      event_hash:
        '79ae6000b20167f9780e18aa723121e0d15c963f7eaa6291b3a14388afce20c5',
    });
  });

  // --- Missing required fields ---

  it('rejects when seq is missing', () => {
    expectInvalid(AuditEventSchema, omitKey(VALID_AUDIT_EVENT, 'seq'), 'seq is required');
  });

  it('rejects when actor is missing', () => {
    expectInvalid(AuditEventSchema, omitKey(VALID_AUDIT_EVENT, 'actor'), 'actor is required');
  });

  it('rejects when event_type is missing', () => {
    expectInvalid(AuditEventSchema, omitKey(VALID_AUDIT_EVENT, 'event_type'), 'event_type is required');
  });

  it('rejects when details is missing', () => {
    expectInvalid(AuditEventSchema, omitKey(VALID_AUDIT_EVENT, 'details'), 'details is required');
  });

  it('rejects when prev_hash is missing', () => {
    expectInvalid(AuditEventSchema, omitKey(VALID_AUDIT_EVENT, 'prev_hash'), 'prev_hash is required');
  });

  it('rejects when event_hash is missing', () => {
    expectInvalid(AuditEventSchema, omitKey(VALID_AUDIT_EVENT, 'event_hash'), 'event_hash is required');
  });

  // --- seq ---

  it('rejects seq as 0 (must start at 1)', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, seq: 0 },
      'seq must be positive',
    );
  });

  it('rejects seq as a float', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, seq: 1.5 },
      'seq must be an integer',
    );
  });

  it('rejects seq as a string', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, seq: '1' },
      'seq must be a number',
    );
  });

  // --- actor ---

  it('rejects unknown actor value', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, actor: 'unknown_actor' },
      'actor must be one of the defined values',
    );
  });

  it('rejects actor with wrong casing', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, actor: 'Examiner' },
      'actor must be lowercase',
    );
  });

  // --- event_type ---

  it('rejects unknown event_type', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, event_type: 'something_happened' },
      'event_type must be one of the defined values',
    );
  });

  // --- details ---

  it('rejects details as null', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, details: null },
      'details must be an object',
    );
  });

  it('rejects details as an array', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, details: [] },
      'details must be a plain object, not an array',
    );
  });

  // --- Hashes ---

  it('rejects event_hash that is too short', () => {
    expectInvalid(
      AuditEventSchema,
      {
        ...VALID_AUDIT_EVENT,
        event_hash: '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18ece',
      },
      'event_hash must be 64 hex chars',
    );
  });

  it('rejects event_hash with uppercase characters', () => {
    expectInvalid(
      AuditEventSchema,
      {
        ...VALID_AUDIT_EVENT,
        event_hash: '7BD79A21490BD2D340B14106F61950781C1788F950B0763B68BACCA91D18ECEB',
      },
      'event_hash must be lowercase hex',
    );
  });

  it('rejects prev_hash that is not 64 zeros or a valid SHA-256', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, prev_hash: 'not-a-hash' },
      'prev_hash must be 64 zeros or a valid SHA-256',
    );
  });

  // --- Timestamps ---

  it('rejects timestamp without UTC suffix', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, timestamp: '2026-11-12T09:15:02.118+05:30' },
      'timestamp with offset must be rejected',
    );
  });

  it('rejects timestamp without milliseconds', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, timestamp: '2026-11-12T09:15:02Z' },
      'timestamp without milliseconds must be rejected',
    );
  });

  it('rejects timestamp with invalid date', () => {
    expectInvalid(
      AuditEventSchema,
      { ...VALID_AUDIT_EVENT, timestamp: '2026-99-99T25:70:00.000Z' },
      'invalid calendar date must be rejected',
    );
  });
});
