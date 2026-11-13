/**
 * Unit tests for P3-07: verifyCase integrity check.
 *
 * Requirements:
 * - Re-hash every file in the manifest and verify the audit chain.
 * - Return a clear list of mismatches.
 * - Test: a tampered screenshot is flagged.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  NodeFileSystem,
  nodeSha256,
  createCaseFolder,
  recordScreenshot,
  appendAudit,
  verifyCase,
} from '../src/index.ts';
import type { CreateCaseInput } from '../src/index.ts';

// ---------------------------------------------------------------------------
// Temp directory setup
// ---------------------------------------------------------------------------

let tmpRoot: string;

before(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'smp-p3-07-'));
});

after(async () => {
  await fsp.rm(tmpRoot, { recursive: true, force: true });
});

async function makeTempDir(label: string): Promise<string> {
  const dir = path.join(tmpRoot, label + '-' + Date.now());
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

const BASE_CASE_INPUT: CreateCaseInput = {
  case_id: 'CASE-2026-0042',
  case_number: 'CCU/FIR/118/2026',
  examiner_name: 'Priya Deshmukh',
  examiner_designation: 'Sub-Inspector',
  accused_name: 'Sample Accused',
  agency: 'Example Cyber Crime Unit',
  device: {
    type: 'desktop',
    name: 'EXAMINER-MAC-01',
    os: 'macOS',
    os_version: '14.5',
    app_version: '0.1.0',
  },
  remarks: 'Test case for verification',
  created_at: '2026-11-12T09:15:02.118Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('verifyCase', () => {
  it('passes cleanly on an intact, fully compliant case', async () => {
    const testDir = await makeTempDir('verify-clean');
    const fs = new NodeFileSystem();

    // 1. Create case
    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    // 2. Record capture_started event
    await appendAudit(
      caseFolderPath,
      {
        actor: 'examiner',
        event_type: 'capture_started',
        details: { platforms: ['instagram'], sections: ['profile'] },
        timestamp: '2026-11-12T09:30:10.004Z',
      },
      fs,
      nodeSha256,
    );

    // 3. Record screenshot
    const fileBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 100, 200, 50]);
    const capturedAt = '2026-11-12T09:31:58.311Z';
    const item = await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: fileBytes,
        capturedAt,
      },
      fs,
      nodeSha256,
    );

    // 4. Record item_captured audit event
    await appendAudit(
      caseFolderPath,
      {
        actor: 'capture_worker',
        event_type: 'item_captured',
        details: {
          item_id: item.item_id,
          platform: item.platform,
          section: item.section,
          file_path: item.file_path,
          sha256: item.sha256,
        },
        timestamp: '2026-11-12T09:31:58.352Z',
      },
      fs,
      nodeSha256,
    );

    // 5. Run verifyCase with recordAuditEvent: true
    const result = await verifyCase(caseFolderPath, fs, nodeSha256, {
      recordAuditEvent: true,
    });

    assert.equal(result.passed, true);
    assert.deepEqual(result.issues, []);
    assert.equal(result.itemsChecked, 1);
    assert.ok(result.auditEvent, 'Should have recorded an integrity_check event');
    assert.equal(result.auditEvent?.event_type, 'integrity_check');
    assert.equal(result.auditEvent?.details.result, 'pass');
  });

  it('flags a tampered screenshot file (hash mismatch)', async () => {
    const testDir = await makeTempDir('verify-tampered');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    const originalBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const item = await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: originalBytes,
        capturedAt: '2026-11-12T09:31:58.311Z',
      },
      fs,
      nodeSha256,
    );

    await appendAudit(
      caseFolderPath,
      {
        actor: 'capture_worker',
        event_type: 'item_captured',
        details: {
          item_id: item.item_id,
          platform: item.platform,
          section: item.section,
          file_path: item.file_path,
          sha256: item.sha256,
        },
        timestamp: '2026-11-12T09:31:58.352Z',
      },
      fs,
      nodeSha256,
    );

    // Tamper with the screenshot file on disk by flipping a byte (keeping same length)
    const filePath = path.join(caseFolderPath, item.file_path);
    const tamperedBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 99, 99, 99]);
    await fsp.writeFile(filePath, tamperedBytes);

    // Run verification
    const result = await verifyCase(caseFolderPath, fs, nodeSha256);

    assert.equal(result.passed, false);
    assert.ok(result.issues.length > 0);
    assert.ok(
      result.issues.some((iss) =>
        iss.includes('[Check 3]') && iss.includes('Hash mismatch') && iss.includes('tampered file'),
      ),
      `Expected [Check 3] Hash mismatch, got: ${result.issues.join('; ')}`,
    );
  });

  it('flags a missing evidence file', async () => {
    const testDir = await makeTempDir('verify-missing-file');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    const item = await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: 'test-screenshot-content',
        capturedAt: '2026-11-12T09:31:58.311Z',
      },
      fs,
      nodeSha256,
    );

    // Delete the screenshot file from disk
    const filePath = path.join(caseFolderPath, item.file_path);
    await fsp.rm(filePath);

    const result = await verifyCase(caseFolderPath, fs, nodeSha256);

    assert.equal(result.passed, false);
    assert.ok(
      result.issues.some((iss) => iss.includes('[Check 3]') && iss.includes('Evidence file missing')),
    );
  });

  it('flags an unlisted file in the screenshots folder', async () => {
    const testDir = await makeTempDir('verify-unlisted-file');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    // Record legitimate item
    await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: 'legit',
        capturedAt: '2026-11-12T09:31:58.311Z',
      },
      fs,
      nodeSha256,
    );

    // Add unlisted rogue screenshot into instagram/screenshots/
    const roguePath = path.join(
      caseFolderPath,
      'instagram',
      'screenshots',
      'instagram_feed_0099_20261112T099999Z.png',
    );
    await fs.write(roguePath, 'rogue screenshot', { recursive: true });

    const result = await verifyCase(caseFolderPath, fs, nodeSha256);

    assert.equal(result.passed, false);
    assert.ok(
      result.issues.some((iss) => iss.includes('[Check 5]') && iss.includes('Unlisted file found')),
    );
  });

  it('flags when hashes.csv is altered', async () => {
    const testDir = await makeTempDir('verify-tampered-csv');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: 'legit',
        capturedAt: '2026-11-12T09:31:58.311Z',
      },
      fs,
      nodeSha256,
    );

    // Overwrite hashes.csv with a bogus hash
    const csvPath = path.join(caseFolderPath, 'hashes.csv');
    await fs.write(
      csvPath,
      'item_id,platform,section,file_path,sha256,captured_at\n' +
        'ITEM-0001,instagram,profile,instagram/screenshots/test.png,0000000000000000000000000000000000000000000000000000000000000000,2026-11-12T09:31:58.311Z\n',
    );

    const result = await verifyCase(caseFolderPath, fs, nodeSha256);

    assert.equal(result.passed, false);
    assert.ok(
      result.issues.some((iss) => iss.includes('[Check 4]')),
    );
  });
});
