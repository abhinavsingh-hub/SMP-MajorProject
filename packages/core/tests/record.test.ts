/**
 * Unit tests for P3-05: sha256 hashing and evidence recorder.
 *
 * Requirements:
 * - recordScreenshot() hashes the file, adds a UTC timestamp, appends to manifest.json and hashes.csv.
 * - Hash function injected via DI.
 * - Test: record two files and check both outputs.
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
  compactUtcTimestamp,
  EvidenceItemSchema,
  HASHES_CSV_HEADER,
} from '../src/index.ts';
import type { CreateCaseInput } from '../src/index.ts';

// ---------------------------------------------------------------------------
// Temp directory setup
// ---------------------------------------------------------------------------

let tmpRoot: string;

before(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'smp-p3-05-'));
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
  remarks: 'Test case for evidence recording',
  created_at: '2026-11-12T09:15:02.118Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('compactUtcTimestamp helper', () => {
  it('converts ISO 8601 UTC timestamp to compact format', () => {
    const compact = compactUtcTimestamp('2026-11-12T09:31:58.311Z');
    assert.equal(compact, '20261112T093158Z');
  });
});

describe('recordScreenshot', () => {
  it('records two files and correctly updates manifest.json and hashes.csv', async () => {
    const testDir = await makeTempDir('record-two-files');
    const fs = new NodeFileSystem();

    // 1. Create initial case folder
    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    // Track hash function calls to verify DI injection
    let hashCalls = 0;
    const diSha256 = async (data: string | Uint8Array) => {
      hashCalls++;
      return nodeSha256(data);
    };

    const file1Bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]); // dummy PNG header + bytes
    const file2Bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 4, 5, 6, 7]);

    const timestamp1 = '2026-11-12T09:31:58.311Z';
    const timestamp2 = '2026-11-12T09:32:21.640Z';

    // 2. Record first screenshot (Instagram profile)
    const item1 = await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: file1Bytes,
        capturedAt: timestamp1,
      },
      fs,
      diSha256,
    );

    // Verify item1 properties
    assert.equal(item1.item_id, 'ITEM-0001');
    assert.equal(item1.platform, 'instagram');
    assert.equal(item1.section, 'profile');
    assert.equal(
      item1.file_path,
      'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png',
    );
    assert.equal(item1.file_size_bytes, file1Bytes.byteLength);
    assert.equal(item1.sha256, await nodeSha256(file1Bytes));
    assert.equal(item1.captured_at, timestamp1);
    EvidenceItemSchema.parse(item1);

    // 3. Record second screenshot (Instagram feed)
    const item2 = await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'feed',
        fileContent: file2Bytes,
        capturedAt: timestamp2,
      },
      fs,
      diSha256,
    );

    // Verify item2 properties
    assert.equal(item2.item_id, 'ITEM-0002');
    assert.equal(item2.platform, 'instagram');
    assert.equal(item2.section, 'feed');
    assert.equal(
      item2.file_path,
      'instagram/screenshots/instagram_feed_0002_20261112T093221Z.png',
    );
    assert.equal(item2.file_size_bytes, file2Bytes.byteLength);
    assert.equal(item2.sha256, await nodeSha256(file2Bytes));
    assert.equal(item2.captured_at, timestamp2);
    EvidenceItemSchema.parse(item2);

    assert.equal(hashCalls, 2, 'Injected DI hash function should be called for each file');

    // 4. Verify manifest.json on disk
    const manifestRaw = await fs.read(path.join(caseFolderPath, 'manifest.json'));
    assert.ok(manifestRaw.endsWith('\n'), 'manifest.json must end with newline');
    const manifest = JSON.parse(manifestRaw);

    assert.equal(manifest.schema_version, '1.0');
    assert.equal(manifest.case_id, 'CASE-2026-0042');
    assert.equal(manifest.hash_algorithm, 'SHA-256');
    assert.equal(manifest.items.length, 2);
    assert.equal(manifest.updated_at, timestamp2);

    assert.deepEqual(manifest.items[0], item1);
    assert.deepEqual(manifest.items[1], item2);

    // 5. Verify hashes.csv on disk
    const hashesCsvRaw = await fs.read(path.join(caseFolderPath, 'hashes.csv'));
    assert.ok(hashesCsvRaw.endsWith('\n'), 'hashes.csv must end with newline');
    const csvLines = hashesCsvRaw.trim().split('\n');

    assert.equal(csvLines.length, 3); // Header + 2 items
    assert.equal(csvLines[0], HASHES_CSV_HEADER);
    assert.equal(
      csvLines[1],
      `${item1.item_id},${item1.platform},${item1.section},${item1.file_path},${item1.sha256},${item1.captured_at}`,
    );
    assert.equal(
      csvLines[2],
      `${item2.item_id},${item2.platform},${item2.section},${item2.file_path},${item2.sha256},${item2.captured_at}`,
    );

    // 6. Verify physical screenshot files exist on disk
    const file1Exists = await fs.exists(path.join(caseFolderPath, item1.file_path));
    const file2Exists = await fs.exists(path.join(caseFolderPath, item2.file_path));
    assert.equal(file1Exists, true);
    assert.equal(file2Exists, true);
  });

  it('records an existing file already saved on disk', async () => {
    const testDir = await makeTempDir('record-preexisting');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    // Write file directly to disk beforehand
    const relPath = 'facebook/screenshots/custom_shot.png';
    const fullPath = path.join(caseFolderPath, relPath);
    await fs.write(fullPath, 'fake-facebook-screenshot-content', { recursive: true });

    const item = await recordScreenshot(
      caseFolderPath,
      {
        platform: 'facebook',
        section: 'profile',
        filePath: relPath,
        capturedAt: '2026-11-12T09:34:03.077Z',
      },
      fs,
      nodeSha256,
    );

    assert.equal(item.item_id, 'ITEM-0001');
    assert.equal(item.file_path, relPath);
    assert.equal(item.file_size_bytes, Buffer.byteLength('fake-facebook-screenshot-content'));
  });

  it('rejects recording when screenshot file does not exist and no content is provided', async () => {
    const testDir = await makeTempDir('record-missing-file');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    await assert.rejects(
      () =>
        recordScreenshot(
          caseFolderPath,
          {
            platform: 'facebook',
            section: 'feed',
            filePath: 'facebook/screenshots/non_existent.png',
          },
          fs,
          nodeSha256,
        ),
      /does not exist/,
    );
  });

  it('rejects duplicate item_id', async () => {
    const testDir = await makeTempDir('record-dup-item');
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
        platform: 'x',
        section: 'feed',
        itemId: 'ITEM-0001',
        fileContent: 'shot1',
      },
      fs,
      nodeSha256,
    );

    await assert.rejects(
      () =>
        recordScreenshot(
          caseFolderPath,
          {
            platform: 'x',
            section: 'feed',
            itemId: 'ITEM-0001',
            fileContent: 'shot2',
          },
          fs,
          nodeSha256,
        ),
      /already exists/,
    );
  });

  it('rejects invalid platform or section', async () => {
    const testDir = await makeTempDir('record-invalid-platform');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    await assert.rejects(
      () =>
        recordScreenshot(
          caseFolderPath,
          {
            platform: 'INVALID_PLATFORM', // uppercase rejected
            section: 'feed',
            fileContent: 'data',
          },
          fs,
          nodeSha256,
        ),
    );
  });
});
