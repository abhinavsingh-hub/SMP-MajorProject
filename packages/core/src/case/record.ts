/**
 * Evidence screenshot recorder — recordScreenshot().
 *
 * Hashes an evidence screenshot file, assigns a unique item_id and UTC timestamp,
 * appends the entry to manifest.json (updating updated_at), and appends the
 * corresponding row to hashes.csv.
 *
 * Conforms to docs/DATA_CONTRACT.md §2.1, §2.2, §3.3, §5, §6.
 */

import { EvidenceItemSchema } from '../schemas/index.ts';
import type { EvidenceItem } from '../schemas/index.ts';
import type { FileSystem } from '../fs/interface.ts';
import { HASHES_CSV_HEADER } from '../fs/paths.ts';
import type { Sha256Fn } from './audit.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts an ISO 8601 UTC timestamp (YYYY-MM-DDTHH:MM:SS.sssZ) to the
 * compact form used in screenshot filenames: YYYYMMDDTHHMMSSZ (DATA_CONTRACT §2.1).
 */
export function compactUtcTimestamp(isoTimestamp: string): string {
  return isoTimestamp.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Joins path segments using forward slashes without trailing slashes.
 */
function joinPaths(...segments: string[]): string {
  return segments
    .map((s, idx) => {
      let clean = s;
      if (idx > 0) {
        clean = clean.replace(/^\/+/, '');
      }
      clean = clean.replace(/\/+$/, '');
      return clean;
    })
    .join('/');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordScreenshotInput {
  /**
   * Absolute path of the case folder.
   * If omitted here, it must be provided as the first argument to recordScreenshot.
   */
  caseFolderPath?: string;

  /** Platform ID (e.g. "instagram", "facebook", "x"). */
  platform: string;

  /** Section ID (e.g. "profile", "feed"). */
  section: string;

  /**
   * Path of the screenshot relative to the case folder.
   * Example: "instagram/screenshots/instagram_profile_0001_20261112T093158Z.png"
   * If omitted, it is generated per DATA_CONTRACT §3.3.
   */
  filePath?: string;

  /**
   * Optional screenshot raw bytes or string content.
   * If provided, it will be written to `filePath` before recording.
   */
  fileContent?: Uint8Array | string;

  /**
   * Item ID (e.g. "ITEM-0001").
   * If omitted, it is calculated from the current number of items in manifest.json.
   */
  itemId?: string;

  /**
   * ISO 8601 UTC timestamp of when the screenshot was captured.
   * If omitted, the current UTC time is used.
   */
  capturedAt?: string;
}

// ---------------------------------------------------------------------------
// recordScreenshot()
// ---------------------------------------------------------------------------

/**
 * Records a screenshot into the case folder:
 * 1. Hashes the file bytes via the injected `sha256` function.
 * 2. Determines/validates `item_id`, `captured_at`, `file_path`, and `file_size_bytes`.
 * 3. Validates the item with `EvidenceItemSchema`.
 * 4. Appends to `manifest.json` and updates `updated_at`.
 * 5. Appends a row to `hashes.csv`.
 */
export async function recordScreenshot(
  caseFolderPath: string,
  input: RecordScreenshotInput,
  fs: FileSystem,
  sha256: Sha256Fn,
): Promise<EvidenceItem>;
export async function recordScreenshot(
  input: RecordScreenshotInput & { caseFolderPath: string },
  fs: FileSystem,
  sha256: Sha256Fn,
): Promise<EvidenceItem>;
export async function recordScreenshot(
  arg1: string | (RecordScreenshotInput & { caseFolderPath: string }),
  arg2: RecordScreenshotInput | FileSystem,
  arg3?: FileSystem | Sha256Fn,
  arg4?: Sha256Fn,
): Promise<EvidenceItem> {
  let caseFolderPath: string;
  let input: RecordScreenshotInput;
  let fs: FileSystem;
  let sha256: Sha256Fn;

  if (typeof arg1 === 'string') {
    caseFolderPath = arg1;
    input = arg2 as RecordScreenshotInput;
    fs = arg3 as FileSystem;
    sha256 = arg4 as Sha256Fn;
  } else {
    caseFolderPath = arg1.caseFolderPath;
    input = arg1;
    fs = arg2 as FileSystem;
    sha256 = arg3 as Sha256Fn;
  }

  if (!caseFolderPath) {
    throw new Error('caseFolderPath is required to record screenshot');
  }

  const manifestPath = joinPaths(caseFolderPath, 'manifest.json');
  const hashesPath = joinPaths(caseFolderPath, 'hashes.csv');

  // 1. Read existing manifest.json
  if (!(await fs.exists(manifestPath))) {
    throw new Error(
      `manifest.json not found in case folder: ${caseFolderPath}. Ensure the case is created first.`,
    );
  }

  const manifestRaw = await fs.read(manifestPath);
  interface RawManifest {
    schema_version: string;
    case_id: string;
    hash_algorithm: string;
    created_at: string;
    updated_at: string;
    items: EvidenceItem[];
  }
  const manifest = JSON.parse(manifestRaw) as RawManifest;

  if (!Array.isArray(manifest.items)) {
    manifest.items = [];
  }

  // 2. Determine itemId
  const itemId =
    input.itemId ??
    `ITEM-${String(manifest.items.length + 1).padStart(4, '0')}`;

  // Check for duplicate item_id
  if (manifest.items.some((it) => it.item_id === itemId)) {
    throw new Error(
      `Item with ID ${itemId} already exists in manifest: ${manifestPath}`,
    );
  }

  // 3. Determine captured_at
  const capturedAt = input.capturedAt ?? new Date().toISOString();

  // 4. Determine file_path
  let relFilePath = input.filePath;
  if (!relFilePath) {
    const compactUtc = compactUtcTimestamp(capturedAt);
    const itemNum = itemId.replace(/^ITEM-/, '');
    const fileName = `${input.platform}_${input.section}_${itemNum}_${compactUtc}.png`;
    relFilePath = `${input.platform}/screenshots/${fileName}`;
  }

  // Ensure relative path does not begin with / or contain ..
  relFilePath = relFilePath.replace(/^\/+/, '');
  if (relFilePath.includes('..')) {
    throw new Error(
      `Invalid relative file path '${relFilePath}': cannot contain '..'`,
    );
  }

  const fullScreenshotPath = joinPaths(caseFolderPath, relFilePath);

  // 5. If fileContent was supplied, write it to disk
  if (input.fileContent !== undefined) {
    if (typeof input.fileContent === 'string') {
      await fs.write(fullScreenshotPath, input.fileContent, { recursive: true });
    } else if (fs.writeBinary) {
      await fs.writeBinary(fullScreenshotPath, input.fileContent, {
        recursive: true,
      });
    } else {
      // Fallback if writeBinary is not implemented
      const decoder = new TextDecoder();
      await fs.write(fullScreenshotPath, decoder.decode(input.fileContent), {
        recursive: true,
      });
    }
  }

  // 6. Read file bytes and compute hash + size
  if (!(await fs.exists(fullScreenshotPath))) {
    throw new Error(
      `Screenshot file does not exist at '${fullScreenshotPath}'`,
    );
  }

  let fileBytes: Uint8Array;
  if (input.fileContent !== undefined) {
    fileBytes =
      typeof input.fileContent === 'string'
        ? new TextEncoder().encode(input.fileContent)
        : input.fileContent;
  } else if (fs.readBinary) {
    fileBytes = await fs.readBinary(fullScreenshotPath);
  } else {
    const str = await fs.read(fullScreenshotPath);
    fileBytes = new TextEncoder().encode(str);
  }

  const fileSizeBytes = fileBytes.byteLength;
  const sha256Hash = await sha256(fileBytes);

  // 7. Validate with EvidenceItemSchema
  const evidenceItem: EvidenceItem = EvidenceItemSchema.parse({
    item_id: itemId,
    platform: input.platform,
    section: input.section,
    file_path: relFilePath,
    file_size_bytes: fileSizeBytes,
    sha256: sha256Hash,
    captured_at: capturedAt,
  });

  // 8. Update manifest.json
  manifest.items.push(evidenceItem);
  manifest.updated_at = capturedAt;
  const updatedManifestJson = JSON.stringify(manifest, null, 2) + '\n';
  await fs.write(manifestPath, updatedManifestJson);

  // 9. Append to hashes.csv
  const csvRow = `${evidenceItem.item_id},${evidenceItem.platform},${evidenceItem.section},${evidenceItem.file_path},${evidenceItem.sha256},${evidenceItem.captured_at}\n`;
  if (await fs.exists(hashesPath)) {
    const currentCsv = await fs.read(hashesPath);
    if (currentCsv.length > 0 && !currentCsv.endsWith('\n')) {
      await fs.append(hashesPath, '\n' + csvRow);
    } else {
      await fs.append(hashesPath, csvRow);
    }
  } else {
    await fs.write(hashesPath, HASHES_CSV_HEADER + '\n' + csvRow);
  }

  return evidenceItem;
}
