/**
 * Case folder builder — createCaseFolder().
 *
 * Creates the complete initial case directory and its four metadata files
 * as described in DATA_CONTRACT.md §3.2:
 *
 *   CASE-YYYY-NNNN/
 *   ├── case.json          (filled in)
 *   ├── manifest.json      (empty items list)
 *   ├── hashes.csv         (header row only)
 *   └── audit_log.jsonl    (case_created event)
 *
 * Platform sub-folders (instagram/, facebook/, etc.) are NOT created here.
 * Per DATA_CONTRACT §3.2, those are created by the capture worker when it
 * first needs them.
 */

import { CaseSchema } from '../schemas/index.ts';
import type { Case, CaseDevice } from '../schemas/index.ts';
import type { FileSystem } from '../fs/interface.ts';
import {
  caseRootPath,
  caseJsonPath,
  manifestJsonPath,
  hashesCsvPath,
  auditLogPath,
  HASHES_CSV_HEADER,
} from '../fs/paths.ts';
import {
  hashAuditEvent,
  ZERO_HASH,
  type Sha256Fn,
} from './audit.ts';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Information the caller must provide to create a new case.
 *
 * `case_id` and `created_at` can be provided by the caller or auto-generated.
 */
export interface CreateCaseInput {
  /**
   * The case ID (format: CASE-YYYY-NNNN).
   * If not provided, it is generated from the current year and `caseNumber`.
   */
  case_id: string;

  /** The official case or FIR number. */
  case_number: string;

  /** Full name of the examiner. */
  examiner_name: string;

  /** Rank or job title. */
  examiner_designation: string;

  /** Name of the accused person. */
  accused_name: string;

  /** Agency or unit name. */
  agency: string;

  /** Device information. */
  device: CaseDevice;

  /** Free-text remarks (use "" if none). */
  remarks: string;

  /**
   * Override the creation timestamp (ISO 8601 UTC).
   * If omitted, `new Date().toISOString()` is used.
   */
  created_at?: string;
}

/** The result of a successful case creation. */
export interface CreateCaseResult {
  /** The validated Case object that was written to case.json. */
  caseData: Case;
  /** Absolute path of the case root directory. */
  caseFolderPath: string;
}

// ---------------------------------------------------------------------------
// createCaseFolder()
// ---------------------------------------------------------------------------

/**
 * Create a complete case folder with all initial metadata files.
 *
 * @param basePath   Absolute path of the parent directory that holds cases.
 * @param input      Case information from the examiner.
 * @param fs         Platform file-system implementation.
 * @param sha256     SHA-256 hash function (platform-provided).
 * @returns          The validated case data and the folder path.
 *
 * @throws If the case folder already exists (prevents accidental overwrites).
 * @throws If the input fails Zod validation against CaseSchema.
 */
export async function createCaseFolder(
  basePath: string,
  input: CreateCaseInput,
  fs: FileSystem,
  sha256: Sha256Fn,
): Promise<CreateCaseResult> {
  const timestamp = input.created_at ?? new Date().toISOString();
  const caseId = input.case_id;

  // 1. Build the full Case object and validate it with the P3-03 schema.
  const caseData: Case = CaseSchema.parse({
    schema_version: '1.0',
    case_id: caseId,
    case_number: input.case_number,
    examiner_name: input.examiner_name,
    examiner_designation: input.examiner_designation,
    accused_name: input.accused_name,
    agency: input.agency,
    created_at: timestamp,
    device: input.device,
    remarks: input.remarks,
  });

  // 2. Refuse to overwrite an existing case folder.
  const rootPath = caseRootPath(basePath, caseId);
  if (await fs.exists(rootPath)) {
    throw new Error(
      `Case folder already exists: ${rootPath}. ` +
        'Will not overwrite an existing case.',
    );
  }

  // 3. Write case.json (pretty-printed, 2 spaces, trailing newline per §2.5).
  const caseJsonContent = JSON.stringify(caseData, null, 2) + '\n';
  await fs.write(caseJsonPath(basePath, caseId), caseJsonContent, {
    recursive: true,
  });

  // 4. Write manifest.json (empty items list, per §3.2 / §5.2).
  const manifest = {
    schema_version: '1.0',
    case_id: caseId,
    hash_algorithm: 'SHA-256',
    created_at: timestamp,
    updated_at: timestamp,
    items: [],
  };
  const manifestContent = JSON.stringify(manifest, null, 2) + '\n';
  await fs.write(manifestJsonPath(basePath, caseId), manifestContent);

  // 5. Write hashes.csv (header row only, per §3.2 / §6.4).
  const csvContent = HASHES_CSV_HEADER + '\n';
  await fs.write(hashesCsvPath(basePath, caseId), csvContent);

  // 6. Write audit_log.jsonl with the case_created event (per §3.2 / §7).
  const auditEvent = await hashAuditEvent(
    {
      seq: 1,
      timestamp,
      actor: 'examiner',
      event_type: 'case_created',
      details: {
        case_number: caseData.case_number,
        examiner_name: caseData.examiner_name,
      },
      prev_hash: ZERO_HASH,
    },
    sha256,
  );

  // Each audit line is a single-line JSON object followed by \n (§7.2 / §2.5).
  const auditLine = JSON.stringify(auditEvent) + '\n';
  await fs.write(auditLogPath(basePath, caseId), auditLine);

  return {
    caseData,
    caseFolderPath: rootPath,
  };
}
