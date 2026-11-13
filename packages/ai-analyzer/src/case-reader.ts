/**
 * Case folder reader for SocialParse evidentiary directories.
 *
 * Adheres to DATA_CONTRACT.md (spec version 1.0).
 * Reads case.json, manifest.json, hashes.csv, and audit_log.jsonl.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CaseFolderData, ManifestItemRef } from './types.js';

export interface CsvHashRow {
  item_id: string;
  platform: string;
  section: string;
  file_path: string;
  sha256: string;
  captured_at: string;
}

export interface AuditLogEntry {
  seq: number;
  timestamp: string;
  actor: string;
  event_type: string;
  details: Record<string, unknown>;
  prev_hash: string;
  event_hash: string;
}

export class CaseReader {
  public readonly caseFolder: string;

  constructor(caseFolder: string) {
    this.caseFolder = path.resolve(caseFolder);
  }

  /**
   * Reads and parses all four evidentiary case files.
   */
  public async readCase(): Promise<CaseFolderData> {
    const caseJsonPath = path.join(this.caseFolder, 'case.json');
    const manifestPath = path.join(this.caseFolder, 'manifest.json');
    const hashesPath = path.join(this.caseFolder, 'hashes.csv');
    const auditLogPath = path.join(this.caseFolder, 'audit_log.jsonl');

    const [caseJsonRaw, manifestRaw, hashesRaw, auditLogRaw] = await Promise.all([
      fs.readFile(caseJsonPath, 'utf-8').catch((err) => {
        throw new Error(`Missing or unreadable case.json at ${caseJsonPath}: ${(err as Error).message}`);
      }),
      fs.readFile(manifestPath, 'utf-8').catch((err) => {
        throw new Error(`Missing or unreadable manifest.json at ${manifestPath}: ${(err as Error).message}`);
      }),
      fs.readFile(hashesPath, 'utf-8').catch(() => null),
      fs.readFile(auditLogPath, 'utf-8').catch(() => null),
    ]);

    const caseJson = JSON.parse(caseJsonRaw) as CaseFolderData['caseJson'];
    const manifest = JSON.parse(manifestRaw) as CaseFolderData['manifest'];

    const hashes: CsvHashRow[] = hashesRaw ? this.parseHashesCsv(hashesRaw) : [];
    const auditEvents: AuditLogEntry[] = auditLogRaw ? this.parseAuditLog(auditLogRaw) : [];

    return {
      caseFolder: this.caseFolder,
      caseJson,
      manifest,
      hashes,
      auditEvents,
    };
  }

  /**
   * Resolves an item's file_path to its absolute path on disk.
   */
  public resolveItemPath(filePath: string): string {
    return path.join(this.caseFolder, filePath);
  }

  /**
   * Checks if an evidence screenshot file physically exists on disk.
   */
  public async itemFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolveItemPath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts normalized item references from manifest.
   */
  public static extractManifestItems(manifest: CaseFolderData['manifest']): ManifestItemRef[] {
    return manifest.items.map((item) => ({
      itemId: item.item_id,
      platform: item.platform,
      section: item.section,
      filePath: item.file_path,
      fileSizeBytes: item.file_size_bytes,
      sha256: item.sha256,
      capturedAt: item.captured_at,
    }));
  }

  /**
   * Parses hashes.csv into structured rows.
   */
  private parseHashesCsv(csvContent: string): CsvHashRow[] {
    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return [];
    }

    const header = lines[0];
    const expectedHeader = 'item_id,platform,section,file_path,sha256,captured_at';
    if (header !== expectedHeader) {
      // Allow flexible whitespace if commas match
      const cols = header.split(',');
      if (cols.length !== 6 || cols[0] !== 'item_id') {
        throw new Error(`Invalid hashes.csv header. Expected '${expectedHeader}', got '${header}'`);
      }
    }

    const rows: CsvHashRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 6) {
        rows.push({
          item_id: parts[0],
          platform: parts[1],
          section: parts[2],
          file_path: parts[3],
          sha256: parts[4],
          captured_at: parts[5],
        });
      }
    }

    return rows;
  }

  /**
   * Parses audit_log.jsonl into structured event entries.
   */
  private parseAuditLog(jsonlContent: string): AuditLogEntry[] {
    const lines = jsonlContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return lines.map((line, idx) => {
      try {
        return JSON.parse(line) as AuditLogEntry;
      } catch (err) {
        throw new Error(`Invalid JSONL at line ${idx + 1} of audit_log.jsonl: ${(err as Error).message}`);
      }
    });
  }
}
