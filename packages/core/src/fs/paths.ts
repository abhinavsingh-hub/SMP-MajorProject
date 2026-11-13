/**
 * Path helpers for SocialParse case folders.
 *
 * All functions return absolute paths by joining a base directory with the
 * well-known file names from DATA_CONTRACT.md (sections 3–7).
 *
 * These helpers use forward-slash joining that works on every platform
 * (DATA_CONTRACT §2.4: "Use forward slashes on every operating system").
 * The `basePath` argument is always the absolute path to the parent
 * directory where cases are stored.
 */

// ---------------------------------------------------------------------------
// Constants (file names from DATA_CONTRACT.md §3.2)
// ---------------------------------------------------------------------------

/** Name of the case metadata file. */
export const CASE_JSON = 'case.json';

/** Name of the evidence manifest. */
export const MANIFEST_JSON = 'manifest.json';

/** Name of the hashes CSV file. */
export const HASHES_CSV = 'hashes.csv';

/** Name of the append-only audit log. */
export const AUDIT_LOG_JSONL = 'audit_log.jsonl';

/** CSV header row for hashes.csv (DATA_CONTRACT §6.2). */
export const HASHES_CSV_HEADER =
  'item_id,platform,section,file_path,sha256,captured_at';

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

/**
 * Join path segments with `/`.
 * Strips trailing slashes from each segment to avoid double separators.
 */
function join(...segments: string[]): string {
  return segments.map((s) => s.replace(/\/+$/, '')).join('/');
}

/** Absolute path of the case root directory. */
export function caseRootPath(basePath: string, caseId: string): string {
  return join(basePath, caseId);
}

/** Absolute path of `case.json` inside a case folder. */
export function caseJsonPath(basePath: string, caseId: string): string {
  return join(basePath, caseId, CASE_JSON);
}

/** Absolute path of `manifest.json` inside a case folder. */
export function manifestJsonPath(basePath: string, caseId: string): string {
  return join(basePath, caseId, MANIFEST_JSON);
}

/** Absolute path of `hashes.csv` inside a case folder. */
export function hashesCsvPath(basePath: string, caseId: string): string {
  return join(basePath, caseId, HASHES_CSV);
}

/** Absolute path of `audit_log.jsonl` inside a case folder. */
export function auditLogPath(basePath: string, caseId: string): string {
  return join(basePath, caseId, AUDIT_LOG_JSONL);
}

/**
 * Absolute path of a platform's evidence directory.
 *
 * Example: `basePath/CASE-2026-0042/instagram/screenshots`
 */
export function evidenceDirPath(
  basePath: string,
  caseId: string,
  platform: string,
): string {
  return join(basePath, caseId, platform, 'screenshots');
}
