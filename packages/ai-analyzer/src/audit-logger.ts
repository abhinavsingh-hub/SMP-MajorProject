/**
 * Audit log append and hash-chaining utility for SocialParse.
 *
 * Implements DATA_CONTRACT.md section 7:
 * - Append-only JSONL format
 * - Sequential numbering (seq = 1, 2, 3...)
 * - ISO 8601 UTC timestamps with milliseconds and Z
 * - SHA-256 hash chaining (canonical JSON sorting)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AuditLogItem {
  seq: number;
  timestamp: string;
  actor: 'examiner' | 'desktop_app' | 'capture_worker' | 'android_app';
  event_type: string;
  details: Record<string, unknown>;
  prev_hash: string;
  event_hash: string;
}

const INITIAL_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes canonical JSON (recursively sorted keys, no whitespace).
 * DATA_CONTRACT.md §7.4 step 2.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(',')}]`;
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJsonStringify(record[key])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Calculates the SHA-256 hash of an event object (excluding its event_hash field).
 */
export function calculateEventHash(eventWithoutHash: Omit<AuditLogItem, 'event_hash'>): string {
  const canonical = canonicalJsonStringify(eventWithoutHash);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Appends a new audit event to audit_log.jsonl with cryptographic hash chaining.
 */
export async function appendAuditEvent(
  caseFolder: string,
  event: {
    actor: 'examiner' | 'desktop_app' | 'capture_worker' | 'android_app';
    event_type: string;
    details: Record<string, unknown>;
    timestamp?: string;
  },
): Promise<AuditLogItem> {
  const auditPath = path.join(caseFolder, 'audit_log.jsonl');
  let lastEvent: AuditLogItem | null = null;

  try {
    const content = await fs.readFile(auditPath, 'utf8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      lastEvent = JSON.parse(lines[lines.length - 1]) as AuditLogItem;
    }
  } catch {
    // If file doesn't exist yet, we start at line 1
  }

  const seq = lastEvent ? lastEvent.seq + 1 : 1;
  const prev_hash = lastEvent ? lastEvent.event_hash : INITIAL_PREV_HASH;
  const timestamp = event.timestamp ?? new Date().toISOString();

  const unhashed: Omit<AuditLogItem, 'event_hash'> = {
    seq,
    timestamp,
    actor: event.actor,
    event_type: event.event_type,
    details: event.details,
    prev_hash,
  };

  const event_hash = calculateEventHash(unhashed);
  const completeEvent: AuditLogItem = { ...unhashed, event_hash };

  await fs.appendFile(auditPath, `${JSON.stringify(completeEvent)}\n`, 'utf8');

  return completeEvent;
}
