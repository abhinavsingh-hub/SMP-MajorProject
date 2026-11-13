/**
 * Unit tests for P3-04: FileSystem interface, path helpers, and createCaseFolder().
 *
 * Uses Node.js built-in test runner (node:test + node:assert).
 *
 * Test groups:
 *   1. NodeFileSystem operations (read, write, append, list, exists)
 *   2. Path helpers
 *   3. Audit hash-chain utilities (canonicalJson, hashAuditEvent)
 *   4. createCaseFolder() — full integration test
 *   5. Error cases (duplicate case, invalid input)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { NodeFileSystem, nodeSha256 } from '../src/fs/node-fs.ts';
import {
  caseRootPath,
  caseJsonPath,
  manifestJsonPath,
  hashesCsvPath,
  auditLogPath,
  evidenceDirPath,
  HASHES_CSV_HEADER,
} from '../src/fs/paths.ts';
import {
  canonicalJson,
  hashAuditEvent,
  ZERO_HASH,
} from '../src/case/audit.ts';
import { createCaseFolder } from '../src/case/create.ts';
import type { CreateCaseInput } from '../src/case/create.ts';
import { CaseSchema, AuditEventSchema } from '../src/schemas/index.ts';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TEST_CASE_ID = 'CASE-2026-0001';
const TEST_TIMESTAMP = '2026-11-12T09:15:02.118Z';

const VALID_INPUT: CreateCaseInput = {
  case_id: TEST_CASE_ID,
  case_number: 'CCU/FIR/118/2026',
  examiner_name: 'Priya Deshmukh',
  examiner_designation: 'Sub-Inspector',
  accused_name: 'Sample Accused',
  agency: 'Example Cyber Crime Unit',
  device: {
    type: 'desktop',
    name: 'TEST-MAC-01',
    os: 'macOS',
    os_version: '14.5',
    app_version: '0.1.0',
  },
  remarks: '',
  created_at: TEST_TIMESTAMP,
};

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------

let tmpRoot: string;

before(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'smp-p3-04-'));
});

after(async () => {
  await fsp.rm(tmpRoot, { recursive: true, force: true });
});

/** Create a unique sub-directory inside tmpRoot for each test group. */
async function makeTempDir(label: string): Promise<string> {
  const dir = path.join(tmpRoot, label + '-' + Date.now());
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// 1. NodeFileSystem operations
// ---------------------------------------------------------------------------

describe('NodeFileSystem', () => {
  const fs = new NodeFileSystem();

  it('write + read: creates and reads a file', async () => {
    const dir = await makeTempDir('fs-rw');
    const filePath = path.join(dir, 'hello.txt');
    await fs.write(filePath, 'hello world');
    const content = await fs.read(filePath);
    assert.equal(content, 'hello world');
  });

  it('write with recursive: creates parent directories', async () => {
    const dir = await makeTempDir('fs-recursive');
    const filePath = path.join(dir, 'a', 'b', 'c', 'deep.txt');
    await fs.write(filePath, 'deep content', { recursive: true });
    const content = await fs.read(filePath);
    assert.equal(content, 'deep content');
  });

  it('append: creates file if missing and appends', async () => {
    const dir = await makeTempDir('fs-append');
    const filePath = path.join(dir, 'log.txt');

    await fs.append(filePath, 'line1\n');
    await fs.append(filePath, 'line2\n');

    const content = await fs.read(filePath);
    assert.equal(content, 'line1\nline2\n');
  });

  it('exists: returns true for existing file', async () => {
    const dir = await makeTempDir('fs-exists');
    const filePath = path.join(dir, 'exists.txt');
    await fs.write(filePath, 'yes');
    assert.equal(await fs.exists(filePath), true);
  });

  it('exists: returns false for missing path', async () => {
    const dir = await makeTempDir('fs-not-exists');
    assert.equal(await fs.exists(path.join(dir, 'nope.txt')), false);
  });

  it('exists: returns true for directories', async () => {
    const dir = await makeTempDir('fs-dir-exists');
    assert.equal(await fs.exists(dir), true);
  });

  it('list: lists directory entries', async () => {
    const dir = await makeTempDir('fs-list');
    await fs.write(path.join(dir, 'a.txt'), 'a');
    await fs.write(path.join(dir, 'b.txt'), 'b');
    await fsp.mkdir(path.join(dir, 'subdir'));

    const entries = await fs.list(dir);
    const names = entries.map((e) => e.name).sort();
    assert.deepEqual(names, ['a.txt', 'b.txt', 'subdir']);

    const subdirEntry = entries.find((e) => e.name === 'subdir');
    assert.equal(subdirEntry?.isDirectory, true);

    const fileEntry = entries.find((e) => e.name === 'a.txt');
    assert.equal(fileEntry?.isDirectory, false);
  });

  it('read: throws for non-existent file', async () => {
    const dir = await makeTempDir('fs-read-err');
    await assert.rejects(() => fs.read(path.join(dir, 'missing.txt')));
  });

  it('list: throws for non-existent directory', async () => {
    const dir = await makeTempDir('fs-list-err');
    await assert.rejects(() => fs.list(path.join(dir, 'no-such-dir')));
  });
});

// ---------------------------------------------------------------------------
// 2. Path helpers
// ---------------------------------------------------------------------------

describe('Path helpers', () => {
  const base = '/data/cases';
  const id = 'CASE-2026-0042';

  it('caseRootPath', () => {
    assert.equal(caseRootPath(base, id), '/data/cases/CASE-2026-0042');
  });

  it('caseJsonPath', () => {
    assert.equal(caseJsonPath(base, id), '/data/cases/CASE-2026-0042/case.json');
  });

  it('manifestJsonPath', () => {
    assert.equal(
      manifestJsonPath(base, id),
      '/data/cases/CASE-2026-0042/manifest.json',
    );
  });

  it('hashesCsvPath', () => {
    assert.equal(
      hashesCsvPath(base, id),
      '/data/cases/CASE-2026-0042/hashes.csv',
    );
  });

  it('auditLogPath', () => {
    assert.equal(
      auditLogPath(base, id),
      '/data/cases/CASE-2026-0042/audit_log.jsonl',
    );
  });

  it('evidenceDirPath', () => {
    assert.equal(
      evidenceDirPath(base, id, 'instagram'),
      '/data/cases/CASE-2026-0042/instagram/screenshots',
    );
  });

  it('strips trailing slashes from basePath', () => {
    assert.equal(caseRootPath('/data/cases/', id), '/data/cases/CASE-2026-0042');
  });
});

// ---------------------------------------------------------------------------
// 3. Audit hash-chain utilities
// ---------------------------------------------------------------------------

describe('Audit utilities', () => {
  it('canonicalJson: sorts keys alphabetically', () => {
    const result = canonicalJson({ z: 1, a: 2, m: 3 });
    assert.equal(result, '{"a":2,"m":3,"z":1}');
  });

  it('canonicalJson: sorts nested objects', () => {
    const result = canonicalJson({ b: { z: 1, a: 2 }, a: 'x' });
    assert.equal(result, '{"a":"x","b":{"a":2,"z":1}}');
  });

  it('canonicalJson: preserves arrays in order', () => {
    const result = canonicalJson({ items: [3, 1, 2] });
    assert.equal(result, '{"items":[3,1,2]}');
  });

  it('hashAuditEvent: matches DATA_CONTRACT §7.4 worked example', async () => {
    // The worked example from the contract:
    // Canonical form:
    // {"actor":"examiner","details":{"case_number":"CCU/FIR/118/2026","examiner_name":"Priya Deshmukh"},"event_type":"case_created","prev_hash":"000...000","seq":1,"timestamp":"2026-11-12T09:15:02.118Z"}
    // SHA-256 = 7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb

    const event = await hashAuditEvent(
      {
        seq: 1,
        timestamp: '2026-11-12T09:15:02.118Z',
        actor: 'examiner',
        event_type: 'case_created',
        details: {
          case_number: 'CCU/FIR/118/2026',
          examiner_name: 'Priya Deshmukh',
        },
        prev_hash: ZERO_HASH,
      },
      nodeSha256,
    );

    assert.equal(
      event.event_hash,
      '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb',
    );
  });

  it('ZERO_HASH is 64 zeros', () => {
    assert.equal(ZERO_HASH.length, 64);
    assert.match(ZERO_HASH, /^0{64}$/);
  });
});

// ---------------------------------------------------------------------------
// 4. createCaseFolder() — full integration test
// ---------------------------------------------------------------------------

describe('createCaseFolder', () => {
  it('creates a complete case folder with all metadata files', async () => {
    const dir = await makeTempDir('create-case');
    const fs = new NodeFileSystem();

    const result = await createCaseFolder(dir, VALID_INPUT, fs, nodeSha256);

    // --- Result object ---
    assert.equal(result.caseData.case_id, TEST_CASE_ID);
    assert.equal(result.caseData.schema_version, '1.0');
    assert.equal(result.caseFolderPath, caseRootPath(dir, TEST_CASE_ID));

    // --- Case folder exists ---
    assert.equal(await fs.exists(caseRootPath(dir, TEST_CASE_ID)), true);

    // --- case.json ---
    const caseJsonRaw = await fs.read(caseJsonPath(dir, TEST_CASE_ID));
    assert.ok(caseJsonRaw.endsWith('\n'), 'case.json must end with newline');

    const caseData = JSON.parse(caseJsonRaw);
    assert.equal(caseData.schema_version, '1.0');
    assert.equal(caseData.case_id, TEST_CASE_ID);
    assert.equal(caseData.case_number, 'CCU/FIR/118/2026');
    assert.equal(caseData.created_at, TEST_TIMESTAMP);
    assert.equal(caseData.device.type, 'desktop');
    assert.equal(caseData.remarks, '');

    // Validate against CaseSchema
    CaseSchema.parse(caseData);

    // Pretty-printed with 2 spaces
    assert.ok(caseJsonRaw.includes('  "schema_version"'), 'case.json must be pretty-printed');

    // --- manifest.json ---
    const manifestRaw = await fs.read(manifestJsonPath(dir, TEST_CASE_ID));
    assert.ok(manifestRaw.endsWith('\n'), 'manifest.json must end with newline');

    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.schema_version, '1.0');
    assert.equal(manifest.case_id, TEST_CASE_ID);
    assert.equal(manifest.hash_algorithm, 'SHA-256');
    assert.equal(manifest.created_at, TEST_TIMESTAMP);
    assert.equal(manifest.updated_at, TEST_TIMESTAMP);
    assert.deepEqual(manifest.items, []);

    // Pretty-printed
    assert.ok(manifestRaw.includes('  "schema_version"'), 'manifest.json must be pretty-printed');

    // --- hashes.csv ---
    const csvRaw = await fs.read(hashesCsvPath(dir, TEST_CASE_ID));
    assert.equal(csvRaw, HASHES_CSV_HEADER + '\n');

    // --- audit_log.jsonl ---
    const auditRaw = await fs.read(auditLogPath(dir, TEST_CASE_ID));
    assert.ok(auditRaw.endsWith('\n'), 'audit_log.jsonl must end with newline');

    const auditEvent = JSON.parse(auditRaw.trim());
    assert.equal(auditEvent.seq, 1);
    assert.equal(auditEvent.actor, 'examiner');
    assert.equal(auditEvent.event_type, 'case_created');
    assert.equal(auditEvent.timestamp, TEST_TIMESTAMP);
    assert.equal(auditEvent.prev_hash, ZERO_HASH);
    assert.equal(auditEvent.details.case_number, 'CCU/FIR/118/2026');
    assert.equal(auditEvent.details.examiner_name, 'Priya Deshmukh');

    // event_hash must be a valid 64-char hex string
    assert.match(auditEvent.event_hash, /^[0-9a-f]{64}$/);

    // Validate against AuditEventSchema
    AuditEventSchema.parse(auditEvent);

    // Verify the hash matches the contract's calculation
    const expectedHash = await nodeSha256(
      canonicalJson({
        seq: 1,
        timestamp: TEST_TIMESTAMP,
        actor: 'examiner',
        event_type: 'case_created',
        details: {
          case_number: 'CCU/FIR/118/2026',
          examiner_name: 'Priya Deshmukh',
        },
        prev_hash: ZERO_HASH,
      }),
    );
    assert.equal(auditEvent.event_hash, expectedHash);

    // Audit line must be a single JSON object on one line (not pretty-printed)
    const auditLines = auditRaw.trim().split('\n');
    assert.equal(auditLines.length, 1, 'audit_log.jsonl must have exactly one line');
  });

  it('returns caseData that passes CaseSchema validation', async () => {
    const dir = await makeTempDir('create-validates');
    const fs = new NodeFileSystem();

    const result = await createCaseFolder(dir, VALID_INPUT, fs, nodeSha256);
    // Should not throw
    CaseSchema.parse(result.caseData);
  });

  it('uses provided created_at timestamp', async () => {
    const dir = await makeTempDir('create-timestamp');
    const fs = new NodeFileSystem();
    const customTs = '2026-01-01T00:00:00.000Z';

    const result = await createCaseFolder(
      dir,
      { ...VALID_INPUT, created_at: customTs },
      fs,
      nodeSha256,
    );

    assert.equal(result.caseData.created_at, customTs);

    const manifest = JSON.parse(
      await fs.read(manifestJsonPath(dir, TEST_CASE_ID)),
    );
    assert.equal(manifest.created_at, customTs);
    assert.equal(manifest.updated_at, customTs);
  });

  it('does not create platform sub-folders', async () => {
    const dir = await makeTempDir('create-no-platforms');
    const fs = new NodeFileSystem();

    await createCaseFolder(dir, VALID_INPUT, fs, nodeSha256);

    const entries = await fs.list(caseRootPath(dir, TEST_CASE_ID));
    const dirEntries = entries.filter((e) => e.isDirectory);
    assert.equal(dirEntries.length, 0, 'No platform directories should be created');
  });

  it('creates exactly 4 metadata files', async () => {
    const dir = await makeTempDir('create-file-count');
    const fs = new NodeFileSystem();

    await createCaseFolder(dir, VALID_INPUT, fs, nodeSha256);

    const entries = await fs.list(caseRootPath(dir, TEST_CASE_ID));
    const fileNames = entries.filter((e) => !e.isDirectory).map((e) => e.name).sort();
    assert.deepEqual(fileNames, [
      'audit_log.jsonl',
      'case.json',
      'hashes.csv',
      'manifest.json',
    ]);
  });
});

// ---------------------------------------------------------------------------
// 5. Error cases
// ---------------------------------------------------------------------------

describe('createCaseFolder errors', () => {
  it('rejects duplicate case folder creation', async () => {
    const dir = await makeTempDir('create-dup');
    const fs = new NodeFileSystem();

    await createCaseFolder(dir, VALID_INPUT, fs, nodeSha256);

    await assert.rejects(
      () => createCaseFolder(dir, VALID_INPUT, fs, nodeSha256),
      (err: Error) => {
        assert.ok(
          err.message.includes('already exists'),
          `Error message should mention "already exists", got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('rejects invalid case_id format', async () => {
    const dir = await makeTempDir('create-bad-id');
    const fs = new NodeFileSystem();

    await assert.rejects(() =>
      createCaseFolder(
        dir,
        { ...VALID_INPUT, case_id: 'BAD-ID' },
        fs,
        nodeSha256,
      ),
    );
  });

  it('rejects empty case_number', async () => {
    const dir = await makeTempDir('create-bad-number');
    const fs = new NodeFileSystem();

    await assert.rejects(() =>
      createCaseFolder(
        dir,
        { ...VALID_INPUT, case_number: '' },
        fs,
        nodeSha256,
      ),
    );
  });

  it('rejects empty examiner_name', async () => {
    const dir = await makeTempDir('create-bad-name');
    const fs = new NodeFileSystem();

    await assert.rejects(() =>
      createCaseFolder(
        dir,
        { ...VALID_INPUT, examiner_name: '' },
        fs,
        nodeSha256,
      ),
    );
  });

  it('rejects invalid device type', async () => {
    const dir = await makeTempDir('create-bad-device');
    const fs = new NodeFileSystem();

    await assert.rejects(() =>
      createCaseFolder(
        dir,
        {
          ...VALID_INPUT,
          device: { ...VALID_INPUT.device, type: 'laptop' as 'desktop' },
        },
        fs,
        nodeSha256,
      ),
    );
  });

  it('rejects invalid timestamp format', async () => {
    const dir = await makeTempDir('create-bad-ts');
    const fs = new NodeFileSystem();

    await assert.rejects(() =>
      createCaseFolder(
        dir,
        { ...VALID_INPUT, created_at: '2026-11-12' },
        fs,
        nodeSha256,
      ),
    );
  });
});
