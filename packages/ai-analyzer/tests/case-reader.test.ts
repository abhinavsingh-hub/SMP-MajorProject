import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CaseReader } from '../src/index.js';

describe('CaseReader', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'case-reader-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads a standard case folder structure correctly', async () => {
    const caseJson = {
      schema_version: '1.0',
      case_id: 'CASE-2026-0042',
      case_number: 'CCU/FIR/118/2026',
      examiner_name: 'Priya Deshmukh',
      examiner_designation: 'Sub-Inspector',
      accused_name: 'Sample Accused',
      agency: 'Example Cyber Crime Unit',
      created_at: '2026-11-12T09:15:02.118Z',
      device: {
        type: 'desktop' as const,
        name: 'EXAMINER-MAC-01',
        os: 'macOS',
        os_version: '14.5',
        app_version: '0.1.0',
      },
      remarks: 'Sample case',
    };

    const manifest = {
      schema_version: '1.0',
      case_id: 'CASE-2026-0042',
      hash_algorithm: 'SHA-256',
      created_at: '2026-11-12T09:15:02.118Z',
      updated_at: '2026-11-12T09:34:27.991Z',
      items: [
        {
          item_id: 'ITEM-0001',
          platform: 'instagram',
          section: 'profile',
          file_path: 'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png',
          file_size_bytes: 482113,
          sha256: 'db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376',
          captured_at: '2026-11-12T09:31:58.311Z',
        },
      ],
    };

    const csvContent =
      'item_id,platform,section,file_path,sha256,captured_at\n' +
      'ITEM-0001,instagram,profile,instagram/screenshots/instagram_profile_0001_20261112T093158Z.png,db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376,2026-11-12T09:31:58.311Z\n';

    const auditContent =
      '{"seq":1,"timestamp":"2026-11-12T09:15:02.118Z","actor":"examiner","event_type":"case_created","details":{"case_number":"CCU/FIR/118/2026"},"prev_hash":"0000000000000000000000000000000000000000000000000000000000000000","event_hash":"7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb"}\n';

    await fs.writeFile(path.join(tmpDir, 'case.json'), JSON.stringify(caseJson, null, 2));
    await fs.writeFile(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.join(tmpDir, 'hashes.csv'), csvContent);
    await fs.writeFile(path.join(tmpDir, 'audit_log.jsonl'), auditContent);

    // Create the actual screenshot file
    const screenshotDir = path.join(tmpDir, 'instagram', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    const screenshotFile = path.join(screenshotDir, 'instagram_profile_0001_20261112T093158Z.png');
    await fs.writeFile(screenshotFile, Buffer.from('fake-png-bytes'));

    const reader = new CaseReader(tmpDir);
    const data = await reader.readCase();

    expect(data.caseJson.case_id).toBe('CASE-2026-0042');
    expect(data.manifest.items.length).toBe(1);
    expect(data.manifest.items[0].sha256).toBe(
      'db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376',
    );
    expect(data.hashes.length).toBe(1);
    expect(data.auditEvents.length).toBe(1);

    const exists = await reader.itemFileExists(data.manifest.items[0].file_path);
    expect(exists).toBe(true);

    const nonExistent = await reader.itemFileExists('instagram/screenshots/non_existent.png');
    expect(nonExistent).toBe(false);

    const extracted = CaseReader.extractManifestItems(data.manifest);
    expect(extracted[0].itemId).toBe('ITEM-0001');
    expect(extracted[0].sha256).toBe(data.manifest.items[0].sha256);
  });

  it('throws error when case.json is missing', async () => {
    const reader = new CaseReader(tmpDir);
    await expect(reader.readCase()).rejects.toThrow(/case\.json/);
  });

  it('handles optional hashes.csv and audit_log.jsonl gracefully if missing', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'case.json'),
      JSON.stringify({ schema_version: '1.0', case_id: 'CASE-2026-0001' }),
    );
    await fs.writeFile(
      path.join(tmpDir, 'manifest.json'),
      JSON.stringify({ schema_version: '1.0', items: [] }),
    );

    const reader = new CaseReader(tmpDir);
    const data = await reader.readCase();
    expect(data.hashes).toEqual([]);
    expect(data.auditEvents).toEqual([]);
  });
});
