/**
 * Case integrity verification — verifyCase().
 *
 * Implements the 8-step verification process defined in DATA_CONTRACT.md §8:
 *   1. Required files exist (case.json, manifest.json, hashes.csv, audit_log.jsonl).
 *   2. Files are valid JSON, schema_version is "1.0", and case_id matches.
 *   3. Evidence files are unchanged: re-hashes every screenshot and checks size.
 *   4. hashes.csv agrees with manifest.json item-by-item.
 *   5. No unlisted files in platform screenshots directories.
 *   6. The audit chain is intact (hashes, sequence, timestamps).
 *   7. The audit log agrees with the manifest (every item has an item_captured event).
 *   8. File names and timestamps follow the exact contract conventions.
 *
 * Optionally appends an `integrity_check` event to audit_log.jsonl.
 */

import { CaseSchema, EvidenceItemSchema } from '../schemas/index.ts';
import type { EvidenceItem, AuditEvent } from '../schemas/index.ts';
import type { FileSystem } from '../fs/interface.ts';
import { HASHES_CSV_HEADER } from '../fs/paths.ts';
import {
  verifyAuditChain,
  appendAudit,
  readAuditLog,
  type Sha256Fn,
} from './audit.ts';
import { compactUtcTimestamp } from './record.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function joinPaths(...segments: string[]): string {
  return segments
    .map((s, idx) => {
      let clean = s;
      if (idx > 0) clean = clean.replace(/^\/+/, '');
      clean = clean.replace(/\/+$/, '');
      return clean;
    })
    .join('/');
}

const FILENAME_REGEX =
  /^[a-z0-9]+_[a-z0-9_]+_[0-9]{4,}_[0-9]{8}T[0-9]{6}Z\.png$/;

const UTC_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerifyCaseOptions {
  /**
   * If true, append an `integrity_check` event to audit_log.jsonl
   * recording the verification outcome (PASS or FAIL) per §8.
   */
  recordAuditEvent?: boolean;
}

export interface CaseVerificationResult {
  /** True if all 8 checks passed without any issues. */
  passed: boolean;
  /** List of human-readable problem descriptions (empty if passed). */
  issues: string[];
  /** Total number of evidence screenshot items verified. */
  itemsChecked: number;
  /** The audit event recorded, if `options.recordAuditEvent` was true. */
  auditEvent?: AuditEvent;
}

// ---------------------------------------------------------------------------
// verifyCase()
// ---------------------------------------------------------------------------

export async function verifyCase(
  caseFolderPath: string,
  fs: FileSystem,
  sha256: Sha256Fn,
  options?: VerifyCaseOptions,
): Promise<CaseVerificationResult> {
  const issues: string[] = [];
  const cleanFolderPath = caseFolderPath.replace(/\/+$/, '');
  const folderBaseName = cleanFolderPath.split('/').pop() || '';

  const caseJsonPath = joinPaths(cleanFolderPath, 'case.json');
  const manifestPath = joinPaths(cleanFolderPath, 'manifest.json');
  const hashesCsvPath = joinPaths(cleanFolderPath, 'hashes.csv');
  const auditLogPath = joinPaths(cleanFolderPath, 'audit_log.jsonl');

  // =========================================================================
  // CHECK 1: Required files exist
  // =========================================================================
  const [caseExists, manifestExists, hashesExists, auditExists] =
    await Promise.all([
      fs.exists(caseJsonPath),
      fs.exists(manifestPath),
      fs.exists(hashesCsvPath),
      fs.exists(auditLogPath),
    ]);

  if (!caseExists) issues.push('[Check 1] Missing required file: case.json');
  if (!manifestExists)
    issues.push('[Check 1] Missing required file: manifest.json');
  if (!hashesExists) issues.push('[Check 1] Missing required file: hashes.csv');
  if (!auditExists)
    issues.push('[Check 1] Missing required file: audit_log.jsonl');

  // Stop early if manifest or case.json are missing to avoid cascading crashes
  if (!caseExists || !manifestExists) {
    return {
      passed: false,
      issues,
      itemsChecked: 0,
    };
  }

  // =========================================================================
  // CHECK 2: Files are valid and agree on the case
  // =========================================================================
  let caseData: { schema_version: string; case_id: string; created_at: string };
  try {
    const rawCase = await fs.read(caseJsonPath);
    caseData = CaseSchema.parse(JSON.parse(rawCase));
  } catch (err) {
    issues.push(
      `[Check 2] case.json is invalid or damaged: ${(err as Error).message}`,
    );
    caseData = { schema_version: '', case_id: '', created_at: '' };
  }

  let manifestData: {
    schema_version: string;
    case_id: string;
    hash_algorithm: string;
    created_at: string;
    updated_at: string;
    items: EvidenceItem[];
  };
  try {
    const rawManifest = await fs.read(manifestPath);
    manifestData = JSON.parse(rawManifest);
    if (manifestData.schema_version !== '1.0') {
      issues.push(
        `[Check 2] manifest.json schema_version must be '1.0', got '${manifestData.schema_version}'`,
      );
    }
    if (!Array.isArray(manifestData.items)) {
      issues.push('[Check 2] manifest.json items must be an array');
      manifestData.items = [];
    }
  } catch (err) {
    issues.push(
      `[Check 2] manifest.json is invalid JSON: ${(err as Error).message}`,
    );
    manifestData = {
      schema_version: '',
      case_id: '',
      hash_algorithm: '',
      created_at: '',
      updated_at: '',
      items: [],
    };
  }

  // Agreement on case_id
  if (
    caseData.case_id &&
    manifestData.case_id &&
    caseData.case_id !== manifestData.case_id
  ) {
    issues.push(
      `[Check 2] case_id mismatch: case.json has '${caseData.case_id}', manifest.json has '${manifestData.case_id}'`,
    );
  }

  // Check folder name matches case_id if folder name follows CASE-YYYY-NNNN format
  if (
    caseData.case_id &&
    folderBaseName.startsWith('CASE-') &&
    folderBaseName !== caseData.case_id
  ) {
    issues.push(
      `[Check 2] Folder name '${folderBaseName}' does not match case_id '${caseData.case_id}'`,
    );
  }

  const items = manifestData.items || [];
  const itemsChecked = items.length;

  // =========================================================================
  // CHECK 3: Evidence files are unchanged (Re-hash every screenshot)
  // =========================================================================
  for (const item of items) {
    const itemFullPath = joinPaths(cleanFolderPath, item.file_path);
    const itemFileExists = await fs.exists(itemFullPath);

    if (!itemFileExists) {
      issues.push(
        `[Check 3] Evidence file missing on disk: '${item.file_path}' (item ${item.item_id})`,
      );
      continue;
    }

    let fileBytes: Uint8Array;
    try {
      if (fs.readBinary) {
        fileBytes = await fs.readBinary(itemFullPath);
      } else {
        const text = await fs.read(itemFullPath);
        fileBytes = new TextEncoder().encode(text);
      }
    } catch (err) {
      issues.push(
        `[Check 3] Failed to read evidence file '${item.file_path}': ${(err as Error).message}`,
      );
      continue;
    }

    // Size check
    if (fileBytes.byteLength !== item.file_size_bytes) {
      issues.push(
        `[Check 3] File size mismatch for '${item.file_path}' (item ${item.item_id}): manifest has ${item.file_size_bytes} bytes, file has ${fileBytes.byteLength} bytes`,
      );
    }

    // SHA-256 check
    const calculatedHash = await sha256(fileBytes);
    if (calculatedHash !== item.sha256) {
      issues.push(
        `[Check 3] Hash mismatch for '${item.file_path}' (item ${item.item_id}): expected sha256 '${item.sha256}', calculated '${calculatedHash}' (tampered file)`,
      );
    }
  }

  // =========================================================================
  // CHECK 4: hashes.csv agrees with the manifest
  // =========================================================================
  if (hashesExists) {
    try {
      const csvRaw = await fs.read(hashesCsvPath);
      const csvLines = csvRaw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (csvLines.length === 0) {
        issues.push('[Check 4] hashes.csv is completely empty');
      } else {
        const header = csvLines[0];
        if (header !== HASHES_CSV_HEADER) {
          issues.push(
            `[Check 4] hashes.csv header invalid: expected '${HASHES_CSV_HEADER}', got '${header}'`,
          );
        }

        const dataRows = csvLines.slice(1);
        if (dataRows.length !== items.length) {
          issues.push(
            `[Check 4] hashes.csv row count (${dataRows.length}) does not match manifest item count (${items.length})`,
          );
        }

        for (let i = 0; i < Math.min(dataRows.length, items.length); i++) {
          const rowCols = dataRows[i].split(',');
          const manifestItem = items[i];

          if (rowCols.length !== 6) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} has ${rowCols.length} columns, expected 6`,
            );
            continue;
          }

          const [rowId, rowPlat, rowSec, rowPath, rowHash, rowCaptured] = rowCols;

          if (rowId !== manifestItem.item_id) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} item_id mismatch: '${rowId}' vs manifest '${manifestItem.item_id}'`,
            );
          }
          if (rowPlat !== manifestItem.platform) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} platform mismatch for ${rowId}: '${rowPlat}' vs manifest '${manifestItem.platform}'`,
            );
          }
          if (rowSec !== manifestItem.section) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} section mismatch for ${rowId}: '${rowSec}' vs manifest '${manifestItem.section}'`,
            );
          }
          if (rowPath !== manifestItem.file_path) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} file_path mismatch for ${rowId}: '${rowPath}' vs manifest '${manifestItem.file_path}'`,
            );
          }
          if (rowHash !== manifestItem.sha256) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} sha256 mismatch for ${rowId}: '${rowHash}' vs manifest '${manifestItem.sha256}'`,
            );
          }
          if (rowCaptured !== manifestItem.captured_at) {
            issues.push(
              `[Check 4] hashes.csv row ${i + 1} captured_at mismatch for ${rowId}: '${rowCaptured}' vs manifest '${manifestItem.captured_at}'`,
            );
          }
        }
      }
    } catch (err) {
      issues.push(
        `[Check 4] Failed to read hashes.csv: ${(err as Error).message}`,
      );
    }
  }

  // =========================================================================
  // CHECK 5: No unlisted files in platform screenshots directories
  // =========================================================================
  const manifestFilePaths = new Set(items.map((it) => it.file_path));

  // Find all platform subdirectories inside case folder
  try {
    const rootEntries = await fs.list(cleanFolderPath);
    for (const entry of rootEntries) {
      if (entry.isDirectory) {
        const screenshotsDir = joinPaths(cleanFolderPath, entry.name, 'screenshots');
        if (await fs.exists(screenshotsDir)) {
          const filesInScreenshots = await fs.list(screenshotsDir);
          for (const shot of filesInScreenshots) {
            if (!shot.isDirectory) {
              const relPath = `${entry.name}/screenshots/${shot.name}`;
              if (!manifestFilePaths.has(relPath)) {
                issues.push(
                  `[Check 5] Unlisted file found in screenshots directory: '${relPath}'`,
                );
              }
            }
          }
        }
      }
    }
  } catch {
    // If listing fails, ignore directory traversal error
  }

  // =========================================================================
  // CHECK 6: The audit chain is intact
  // =========================================================================
  let auditEvents: AuditEvent[] = [];
  if (auditExists) {
    try {
      auditEvents = await readAuditLog(cleanFolderPath, fs);
      const chainVerification = await verifyAuditChain(auditEvents, sha256);
      if (!chainVerification.valid) {
        for (const iss of chainVerification.issues) {
          issues.push(`[Check 6] ${iss}`);
        }
      }
    } catch (err) {
      issues.push(
        `[Check 6] Failed to read/validate audit_log.jsonl: ${(err as Error).message}`,
      );
    }
  }

  // =========================================================================
  // CHECK 7: The audit log agrees with the manifest
  // =========================================================================
  const itemCapturedEvents = auditEvents.filter(
    (ev) => ev.event_type === 'item_captured',
  );

  // Map item_id to event
  const eventsByItemId = new Map<string, AuditEvent>();
  for (const ev of itemCapturedEvents) {
    const itemId = ev.details.item_id as string | undefined;
    if (itemId) {
      if (eventsByItemId.has(itemId)) {
        issues.push(
          `[Check 7] Multiple item_captured events for item_id '${itemId}' in audit log`,
        );
      }
      eventsByItemId.set(itemId, ev);
    }
  }

  // Every manifest item must have an item_captured event
  for (const item of items) {
    const ev = eventsByItemId.get(item.item_id);
    if (!ev) {
      issues.push(
        `[Check 7] Manifest item '${item.item_id}' has no matching item_captured event in audit log`,
      );
    } else {
      if (ev.details.file_path !== item.file_path) {
        issues.push(
          `[Check 7] Audit log item_captured for '${item.item_id}' has file_path '${ev.details.file_path}', manifest has '${item.file_path}'`,
        );
      }
      if (ev.details.sha256 !== item.sha256) {
        issues.push(
          `[Check 7] Audit log item_captured for '${item.item_id}' has sha256 '${ev.details.sha256}', manifest has '${item.sha256}'`,
        );
      }
    }
  }

  // Every item_captured event must match a manifest item
  for (const ev of itemCapturedEvents) {
    const evItemId = ev.details.item_id as string | undefined;
    if (evItemId && !items.some((it) => it.item_id === evItemId)) {
      issues.push(
        `[Check 7] Audit log contains item_captured event for '${evItemId}' which is not in manifest.json`,
      );
    }
  }

  // =========================================================================
  // CHECK 8: Names and timestamps follow the rules
  // =========================================================================
  // Check timestamps in case.json and manifest.json
  if (caseData.created_at && !UTC_TIMESTAMP_REGEX.test(caseData.created_at)) {
    issues.push(
      `[Check 8] case.json created_at is not a valid ISO 8601 UTC timestamp: '${caseData.created_at}'`,
    );
  }
  if (
    manifestData.created_at &&
    !UTC_TIMESTAMP_REGEX.test(manifestData.created_at)
  ) {
    issues.push(
      `[Check 8] manifest.json created_at is not a valid ISO 8601 UTC timestamp: '${manifestData.created_at}'`,
    );
  }
  if (
    manifestData.updated_at &&
    !UTC_TIMESTAMP_REGEX.test(manifestData.updated_at)
  ) {
    issues.push(
      `[Check 8] manifest.json updated_at is not a valid ISO 8601 UTC timestamp: '${manifestData.updated_at}'`,
    );
  }

  // Check each item
  for (const item of items) {
    // Validate schema
    try {
      EvidenceItemSchema.parse(item);
    } catch (err) {
      issues.push(
        `[Check 8] Item '${item.item_id}' schema validation error: ${(err as Error).message}`,
      );
    }

    // Filename pattern check
    const fileName = item.file_path.split('/').pop() || '';
    if (!FILENAME_REGEX.test(fileName)) {
      issues.push(
        `[Check 8] Screenshot filename '${fileName}' does not match pattern {platform}_{section}_{item_number}_{captured_utc}.png`,
      );
    } else {
      // Check filename components match item fields
      const parts = fileName.replace(/\.png$/, '').split('_');
      const filePlatform = parts[0];
      const fileSection = parts.slice(1, parts.length - 2).join('_');
      const fileItemNum = parts[parts.length - 2];
      const fileCapturedUtc = parts[parts.length - 1];

      if (filePlatform !== item.platform) {
        issues.push(
          `[Check 8] Filename platform '${filePlatform}' does not match item platform '${item.platform}' in '${fileName}'`,
        );
      }
      if (fileSection !== item.section) {
        issues.push(
          `[Check 8] Filename section '${fileSection}' does not match item section '${item.section}' in '${fileName}'`,
        );
      }
      const expectedItemNum = item.item_id.replace(/^ITEM-/, '');
      if (fileItemNum !== expectedItemNum) {
        issues.push(
          `[Check 8] Filename item number '${fileItemNum}' does not match item_id '${item.item_id}' in '${fileName}'`,
        );
      }
      const expectedCompactUtc = compactUtcTimestamp(item.captured_at);
      if (fileCapturedUtc !== expectedCompactUtc) {
        issues.push(
          `[Check 8] Filename compact time '${fileCapturedUtc}' does not match captured_at '${item.captured_at}' in '${fileName}'`,
        );
      }
    }
  }

  const passed = issues.length === 0;

  // Record integrity_check audit event if requested
  let recordedAuditEvent: AuditEvent | undefined;
  if (options?.recordAuditEvent && auditExists) {
    recordedAuditEvent = await appendAudit(
      cleanFolderPath,
      {
        actor: 'desktop_app',
        event_type: 'integrity_check',
        details: {
          result: passed ? 'pass' : 'fail',
          items_checked: itemsChecked,
          issues: issues,
        },
      },
      fs,
      sha256,
    );
  }

  return {
    passed,
    issues,
    itemsChecked,
    auditEvent: recordedAuditEvent,
  };
}
