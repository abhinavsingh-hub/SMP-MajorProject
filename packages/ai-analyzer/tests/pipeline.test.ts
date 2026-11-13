import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  AnalysisPipeline,
  appendAuditEvent,
  canonicalJsonStringify,
  MockOcrEngine,
  OcrService,
  QualityChecker,
} from '../src/index.js';

describe('Audit Logger & Pipeline Orchestrator', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pipeline-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('canonicalizes JSON according to DATA_CONTRACT.md section 7', () => {
    const input = {
      z_last: 1,
      a_first: 'hello',
      nested: {
        y: true,
        x: [3, 2, 1],
      },
    };

    const canonical = canonicalJsonStringify(input);
    expect(canonical).toBe('{"a_first":"hello","nested":{"x":[3,2,1],"y":true},"z_last":1}');
  });

  it('appends hash-chained audit events sequentially', async () => {
    const ev1 = await appendAuditEvent(tmpDir, {
      actor: 'examiner',
      event_type: 'case_created',
      details: { case_number: 'TEST/FIR/001' },
    });

    expect(ev1.seq).toBe(1);
    expect(ev1.prev_hash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(ev1.event_hash).toHaveLength(64);

    const ev2 = await appendAuditEvent(tmpDir, {
      actor: 'desktop_app',
      event_type: 'capture_resumed',
      details: { action: 'ai_analysis_started' },
    });

    expect(ev2.seq).toBe(2);
    expect(ev2.prev_hash).toBe(ev1.event_hash);
  });

  it('orchestrates end-to-end analysis on mock case files', async () => {
    // 1. Create case folder metadata
    const caseJson = {
      schema_version: '1.0',
      case_id: 'CASE-2026-0099',
      case_number: 'NIA/CCU/2026/01',
      examiner_name: 'Inspector Sharma',
      examiner_designation: 'Cyber Cell',
      accused_name: 'Target Accused',
      agency: 'National Investigation Agency',
      created_at: '2026-11-12T09:15:02.118Z',
      device: {
        type: 'desktop' as const,
        name: 'ANALYZER-WS',
        os: 'macOS',
        os_version: '15.0',
        app_version: '0.1.0',
      },
      remarks: 'Automated test case',
    };

    const manifestSha = 'a6a9af4e85fa76d00a927cf62b0170d4a5208f61eda9c35aa9494bbfb84fe7fc';
    const manifest = {
      schema_version: '1.0',
      case_id: 'CASE-2026-0099',
      hash_algorithm: 'SHA-256',
      created_at: '2026-11-12T09:15:02.118Z',
      updated_at: '2026-11-12T09:34:27.991Z',
      items: [
        {
          item_id: 'ITEM-0001',
          platform: 'instagram',
          section: 'profile',
          file_path: 'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png',
          file_size_bytes: 1024,
          sha256: manifestSha,
          captured_at: '2026-11-12T09:31:58.311Z',
        },
      ],
    };

    await fs.writeFile(path.join(tmpDir, 'case.json'), JSON.stringify(caseJson));
    await fs.writeFile(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest));

    // Create synthetic screenshot
    const screenshotDir = path.join(tmpDir, 'instagram', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'instagram_profile_0001_20261112T093158Z.png');
    const pngBuffer = QualityChecker.createSyntheticPng({ width: 32, height: 32, pattern: 'checkerboard' });
    await fs.writeFile(screenshotPath, pngBuffer);

    // Mock OCR text
    const mockOcr = new MockOcrEngine('Bio: @suspect_official Contact: +919988776655');
    const ocrService = new OcrService({ engine: mockOcr });

    const pipeline = new AnalysisPipeline({ ocrService });
    const result = await pipeline.analyzeCase(tmpDir);

    expect(result.records).toHaveLength(1);
    const rec = result.records[0];
    expect(rec.screenshotId).toBe('ITEM-0001');
    expect(rec.platform).toBe('instagram');
    expect(rec.sha256).toBe(manifestSha); // Exactly preserved from manifest
    expect(rec.category).toBe('profile');
    expect(rec.entities.some((e) => e.value === '@suspect_official')).toBe(true);
    expect(rec.entities.some((e) => e.value === '+919988776655')).toBe(true);
    expect(rec.machineGeneratedDisclaimer).toBe('machine-generated, examiner must verify');

    // Case summary entity cross-index
    expect(result.caseSummary.entityIndex['handle:@suspect_official']).toBeDefined();
    expect(result.caseSummary.entityIndex['handle:@suspect_official'].appearances[0].platform).toBe('instagram');

    // Verify audit log has entries
    const auditLogContent = await fs.readFile(path.join(tmpDir, 'audit_log.jsonl'), 'utf8');
    const lines = auditLogContent.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});
