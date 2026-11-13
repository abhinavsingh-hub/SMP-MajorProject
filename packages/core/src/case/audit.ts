/**
 * Audit-log hash-chain utilities.
 *
 * Implements the event_hash calculation described in DATA_CONTRACT.md §7.4:
 *   1. Build the event object WITHOUT the `event_hash` field.
 *   2. Serialise it as canonical JSON (keys sorted alphabetically at every
 *      level, no whitespace).
 *   3. SHA-256 the UTF-8 bytes → 64 lowercase hex characters.
 *   4. Attach the result as `event_hash`.
 *
 * Provides appendAudit() for append-only hash-chained logging and
 * verifyAuditChain() for validating tamper-evidence.
 */

import { AuditEventSchema } from '../schemas/index.ts';
import type {
  AuditEvent,
  AuditActor,
  AuditDetails,
  AuditEventType,
} from '../schemas/index.ts';
import type { FileSystem } from '../fs/interface.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The prev_hash for the very first audit line (64 zeros). */
export const ZERO_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input to build a single audit event (before hashing). */
export interface AuditEventInput {
  seq: number;
  timestamp: string;
  actor: AuditActor;
  event_type: AuditEventType;
  details: AuditDetails;
  prev_hash: string;
}

/** A fully hashed audit event ready to be written. */
export interface HashedAuditEvent extends AuditEventInput {
  event_hash: string;
}

/**
 * A function that returns the SHA-256 hex digest of a UTF-8 string or raw bytes.
 * Implementations can use Node.js `crypto`, Web Crypto, or React Native libs.
 */
export type Sha256Fn = (data: string | Uint8Array) => Promise<string>;

/** Input parameters to append a new event to the audit log. */
export interface AppendAuditInput {
  /** Optional when passed as first parameter to appendAudit */
  caseFolderPath?: string;
  actor: AuditActor;
  event_type: AuditEventType;
  details: AuditDetails;
  /** ISO 8601 UTC timestamp; defaults to current time if omitted */
  timestamp?: string;
}

/** Result of an audit chain verification check. */
export interface AuditVerificationResult {
  valid: boolean;
  brokenAtSeq?: number;
  issues: string[];
}

// ---------------------------------------------------------------------------
// Canonical JSON
// ---------------------------------------------------------------------------

/**
 * Produce canonical JSON: keys sorted alphabetically at every level,
 * no spaces, no line breaks (DATA_CONTRACT.md §7.4 step 2).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return val;
  });
}

// ---------------------------------------------------------------------------
// Hash an audit event
// ---------------------------------------------------------------------------

/**
 * Build a complete audit event with `event_hash` computed per §7.4.
 */
export async function hashAuditEvent(
  input: AuditEventInput,
  sha256: Sha256Fn,
): Promise<HashedAuditEvent> {
  const eventWithoutHash: AuditEventInput = {
    seq: input.seq,
    timestamp: input.timestamp,
    actor: input.actor,
    event_type: input.event_type,
    details: input.details,
    prev_hash: input.prev_hash,
  };

  const canonical = canonicalJson(eventWithoutHash);
  const eventHash = await sha256(canonical);

  return {
    ...eventWithoutHash,
    event_hash: eventHash,
  };
}

// ---------------------------------------------------------------------------
// readAuditLog()
// ---------------------------------------------------------------------------

/**
 * Reads and parses all events from audit_log.jsonl in the given case folder.
 * Returns an empty array if the file does not exist or is empty.
 */
export async function readAuditLog(
  caseFolderPath: string,
  fs: FileSystem,
): Promise<AuditEvent[]> {
  const logPath = caseFolderPath.replace(/\/+$/, '') + '/audit_log.jsonl';
  if (!(await fs.exists(logPath))) {
    return [];
  }

  const raw = await fs.read(logPath);
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, idx) => {
    try {
      const parsed = JSON.parse(line);
      return AuditEventSchema.parse(parsed);
    } catch (err) {
      throw new Error(
        `Failed to parse audit log line ${idx + 1}: ${(err as Error).message}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// appendAudit()
// ---------------------------------------------------------------------------

/**
 * Appends a new event to the case's audit_log.jsonl, automatically calculating
 * the next sequence number, linking prev_hash, and calculating event_hash per §7.4.
 */
export async function appendAudit(
  caseFolderPath: string,
  input: AppendAuditInput,
  fs: FileSystem,
  sha256: Sha256Fn,
): Promise<AuditEvent>;
export async function appendAudit(
  input: AppendAuditInput & { caseFolderPath: string },
  fs: FileSystem,
  sha256: Sha256Fn,
): Promise<AuditEvent>;
export async function appendAudit(
  arg1: string | (AppendAuditInput & { caseFolderPath: string }),
  arg2: AppendAuditInput | FileSystem,
  arg3?: FileSystem | Sha256Fn,
  arg4?: Sha256Fn,
): Promise<AuditEvent> {
  let caseFolderPath: string;
  let input: AppendAuditInput;
  let fs: FileSystem;
  let sha256: Sha256Fn;

  if (typeof arg1 === 'string') {
    caseFolderPath = arg1;
    input = arg2 as AppendAuditInput;
    fs = arg3 as FileSystem;
    sha256 = arg4 as Sha256Fn;
  } else {
    caseFolderPath = arg1.caseFolderPath;
    input = arg1;
    fs = arg2 as FileSystem;
    sha256 = arg3 as Sha256Fn;
  }

  if (!caseFolderPath) {
    throw new Error('caseFolderPath is required to append audit event');
  }

  const logPath = caseFolderPath.replace(/\/+$/, '') + '/audit_log.jsonl';

  // Read existing entries to determine last seq and prev_hash
  const existingEvents = await readAuditLog(caseFolderPath, fs);

  let nextSeq = 1;
  let prevHash = ZERO_HASH;

  if (existingEvents.length > 0) {
    const lastEvent = existingEvents[existingEvents.length - 1];
    nextSeq = lastEvent.seq + 1;
    prevHash = lastEvent.event_hash;
  }

  const timestamp = input.timestamp ?? new Date().toISOString();

  // Hash the new event
  const unhashed: AuditEventInput = {
    seq: nextSeq,
    timestamp,
    actor: input.actor,
    event_type: input.event_type,
    details: input.details,
    prev_hash: prevHash,
  };

  const hashed = await hashAuditEvent(unhashed, sha256);
  const validatedEvent: AuditEvent = AuditEventSchema.parse(hashed);

  // Write single-line JSON followed by newline
  const line = JSON.stringify(validatedEvent) + '\n';

  if (await fs.exists(logPath)) {
    const rawContent = await fs.read(logPath);
    if (rawContent.length > 0 && !rawContent.endsWith('\n')) {
      await fs.append(logPath, '\n' + line);
    } else {
      await fs.append(logPath, line);
    }
  } else {
    await fs.write(logPath, line, { recursive: true });
  }

  return validatedEvent;
}

// ---------------------------------------------------------------------------
// verifyAuditChain()
// ---------------------------------------------------------------------------

/**
 * Verifies the integrity of an audit log per DATA_CONTRACT §8 Check 6:
 * - seq runs 1, 2, 3... without gaps.
 * - For line 1, prev_hash is 64 zeros.
 * - For line > 1, prev_hash equals the previous event_hash.
 * - Every event_hash equals the SHA-256 of canonical JSON without event_hash.
 * - Timestamps never go backwards.
 */
export async function verifyAuditChain(
  eventsOrRaw: AuditEvent[] | string,
  sha256: Sha256Fn,
): Promise<AuditVerificationResult> {
  let events: AuditEvent[];

  if (typeof eventsOrRaw === 'string') {
    const lines = eventsOrRaw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    events = lines.map((line, idx) => {
      try {
        const parsed = JSON.parse(line);
        return AuditEventSchema.parse(parsed);
      } catch (err) {
        throw new Error(
          `Invalid JSON on audit log line ${idx + 1}: ${(err as Error).message}`,
        );
      }
    });
  } else {
    events = eventsOrRaw;
  }

  const issues: string[] = [];
  let brokenAtSeq: number | undefined;

  if (events.length === 0) {
    return { valid: true, issues: [] };
  }

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const expectedSeq = i + 1;

    // Check sequence continuity
    if (current.seq !== expectedSeq) {
      issues.push(
        `Sequence gap at line ${i + 1}: expected seq ${expectedSeq}, got ${current.seq}`,
      );
      if (brokenAtSeq === undefined) brokenAtSeq = current.seq;
    }

    // Check prev_hash
    if (i === 0) {
      if (current.prev_hash !== ZERO_HASH) {
        issues.push(
          `Line 1 prev_hash must be 64 zeros, got: ${current.prev_hash}`,
        );
        if (brokenAtSeq === undefined) brokenAtSeq = current.seq;
      }
    } else {
      const prev = events[i - 1];
      if (current.prev_hash !== prev.event_hash) {
        issues.push(
          `Hash chain break at line ${i + 1} (seq ${current.seq}): prev_hash '${current.prev_hash}' does not match line ${i} event_hash '${prev.event_hash}'`,
        );
        if (brokenAtSeq === undefined) brokenAtSeq = current.seq;
      }

      // Check timestamps do not go backwards
      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(current.timestamp).getTime();
      if (currTime < prevTime) {
        issues.push(
          `Timestamp went backwards at line ${i + 1} (seq ${current.seq}): ${current.timestamp} is earlier than ${prev.timestamp}`,
        );
        if (brokenAtSeq === undefined) brokenAtSeq = current.seq;
      }
    }

    // Recalculate event_hash
    const expectedHash = await sha256(
      canonicalJson({
        seq: current.seq,
        timestamp: current.timestamp,
        actor: current.actor,
        event_type: current.event_type,
        details: current.details,
        prev_hash: current.prev_hash,
      }),
    );

    if (current.event_hash !== expectedHash) {
      issues.push(
        `Event hash tampering detected at line ${i + 1} (seq ${current.seq}): stored '${current.event_hash}', calculated '${expectedHash}'`,
      );
      if (brokenAtSeq === undefined) brokenAtSeq = current.seq;
    }
  }

  return {
    valid: issues.length === 0,
    brokenAtSeq,
    issues,
  };
}
