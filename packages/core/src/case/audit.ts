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
 * The SHA-256 function is injected so this module stays platform-independent.
 */

import type { AuditActor, AuditDetails, AuditEventType } from '../schemas/index.ts';

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
 * A function that returns the SHA-256 hex digest of a UTF-8 string.
 * Implementations can use Node.js `crypto`, Web Crypto, or React Native libs.
 */
export type Sha256Fn = (data: string) => Promise<string>;

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
  // The event object without event_hash (step 1)
  const eventWithoutHash: AuditEventInput = {
    seq: input.seq,
    timestamp: input.timestamp,
    actor: input.actor,
    event_type: input.event_type,
    details: input.details,
    prev_hash: input.prev_hash,
  };

  // Canonical JSON (step 2) and SHA-256 (step 3)
  const canonical = canonicalJson(eventWithoutHash);
  const eventHash = await sha256(canonical);

  return {
    ...eventWithoutHash,
    event_hash: eventHash,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The prev_hash for the very first audit line (64 zeros). */
export const ZERO_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';
