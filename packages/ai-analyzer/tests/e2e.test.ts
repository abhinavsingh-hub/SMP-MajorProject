import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  AnalysisPipeline,
  AnalysisWriter,
  buildFullPanchnamaAiReportHtml,
  MockOcrEngine,
  OcrService,
  QualityChecker,
} from '../src/index.js';

describe('End-to-End Pipeline & Case Documentation', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-analyzer-e2e-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('runs the complete AI analysis and Panchnama reporting pipeline on a multi-platform case', async () => {
    const caseJson = {
      schema_version: '1.0',
      case_id: 'CASE-2026-E2E',
      case_number: 'NIA/ACTD/E2E-2026',
      examiner_name: 'Inspector Verma',
      examiner_designation: 'Cyber Operations Lead',
      accused_name: 'Target Accused',
      agency: 'National Investigation Agency (NIA)',
      created_at: '2026-11-12T09:15:02.118Z',
      device: {
        type: 'desktop' as const,
        name: 'EXAMINER-MAC',
        os: 'macOS',
        os_version: '15.0',
        app_version: '0.1.0',
      },
      remarks: 'End to end validation case.',
    };

    const platforms = ['instagram', 'facebook', 'telegram'];
    for (const p of platforms) {
      await fs.mkdir(path.join(tmpDir, p, 'screenshots'), { recursive: true });
    }

    const testItems = [
      {
        item_id: 'ITEM-0001',
        platform: 'instagram',
        section: 'profile',
        fileName: 'instagram_profile_0001_20261112T093158Z.png',
        pattern: 'checkerboard' as const,
        ocr: 'User: @target_intel Phone: +919876543210 Bio: Confidential',
      },
      {
        item_id: 'ITEM-0002',
        platform: 'telegram',
        section: 'secret_chat',
        fileName: 'telegram_secret_chat_0002_20261112T093220Z.png',
        pattern: 'solid' as const,
        fillColor: [0, 0, 0] as [number, number, number], // Solid black screen (FLAG_SECURE)
        ocr: '',
      },
      {
        item_id: 'ITEM-0003',
        platform: 'facebook',
        section: 'profile',
        fileName: 'facebook_profile_0003_20261112T093315Z.png',
        pattern: 'checkerboard' as const,
        ocr: 'Facebook Profile Phone: +919876543210 Email: target@intel.org',
      },
      {
        item_id: 'ITEM-0004',
        platform: 'facebook',
        section: 'profile_dup',
        fileName: 'facebook_profile_0004_20261112T093340Z.png',
        pattern: 'checkerboard' as const, // Duplicate of ITEM-0003
        ocr: 'Facebook Profile Phone: +919876543210 Email: target@intel.org',
      },
    ];

    const manifestItems = [];
    const csvRows = ['item_id,platform,section,file_path,sha256,captured_at'];
    const mockOcr = new MockOcrEngine();

    for (const it of testItems) {
      const relPath = `${it.platform}/screenshots/${it.fileName}`;
      const absPath = path.join(tmpDir, relPath);

      const buf = QualityChecker.createSyntheticPng({
        width: 32,
        height: 32,
        pattern: it.pattern,
        fillColor: it.fillColor,
      });
      await fs.writeFile(absPath, buf);

      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      const captured_at = '2026-11-12T09:31:58.311Z';

      manifestItems.push({
        item_id: it.item_id,
        platform: it.platform,
        section: it.section,
        file_path: relPath,
        file_size_bytes: buf.length,
        sha256,
        captured_at,
      });

      csvRows.push(`${it.item_id},${it.platform},${it.section},${relPath},${sha256},${captured_at}`);
      mockOcr.setMockResult(absPath, it.ocr);
    }

    const manifest = {
      schema_version: '1.0',
      case_id: caseJson.case_id,
      hash_algorithm: 'SHA-256',
      created_at: caseJson.created_at,
      updated_at: '2026-11-12T09:34:00.000Z',
      items: manifestItems,
    };

    await fs.writeFile(path.join(tmpDir, 'case.json'), JSON.stringify(caseJson, null, 2));
    await fs.writeFile(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.join(tmpDir, 'hashes.csv'), `${csvRows.join('\n')}\n`);

    // 1. Run pipeline
    const ocrService = new OcrService({ engine: mockOcr });
    const pipeline = new AnalysisPipeline({ ocrService });
    const runResult = await pipeline.analyzeCase(tmpDir);

    expect(runResult.records).toHaveLength(4);

    // Verify SHA-256 hashes preserved exactly
    for (let i = 0; i < 4; i++) {
      expect(runResult.records[i].sha256).toBe(manifestItems[i].sha256);
      expect(runResult.records[i].machineGeneratedDisclaimer).toBe('machine-generated, examiner must verify');
    }

    // Verify FLAG_SECURE detection on Item 2
    const telegramRecord = runResult.records.find((r) => r.screenshotId === 'ITEM-0002');
    expect(telegramRecord?.flags).toContain('FLAG_SECURE_BLOCKED');
    expect(telegramRecord?.summary).toContain('Android FLAG_SECURE');

    // Verify duplicate detection on Item 4
    const dupRecord = runResult.records.find((r) => r.screenshotId === 'ITEM-0004');
    expect(dupRecord?.flags).toContain('DUPLICATE');

    // Verify cross-platform entity index correlation
    const phoneEntry = runResult.caseSummary.entityIndex['phone:+919876543210'];
    expect(phoneEntry).toBeDefined();
    expect(phoneEntry.appearances.length).toBeGreaterThanOrEqual(2);
    const platformsWithPhone = phoneEntry.appearances.map((a) => a.platform);
    expect(platformsWithPhone).toContain('instagram');
    expect(platformsWithPhone).toContain('facebook');

    // 2. Persist analysis outputs
    const writer = new AnalysisWriter();
    const writeResult = await writer.writeAnalysisResults(tmpDir, runResult);

    expect(writeResult.platformFilesWritten).toHaveLength(3);
    const summaryOnDisk = await writer.readCaseSummary(tmpDir);
    expect(summaryOnDisk.caseId).toBe('CASE-2026-E2E');
    expect(summaryOnDisk.totalScreenshots).toBe(4);

    // 3. Generate HTML report
    const fullHtml = buildFullPanchnamaAiReportHtml(caseJson, runResult);
    expect(fullHtml).toContain('CASE-2026-E2E');
    expect(fullHtml).toContain('NIA/ACTD/E2E-2026');
    expect(fullHtml).toContain('FLAG_SECURE_BLOCKED');
    expect(fullHtml).toContain('Cross-Platform Entity Correlation Index');
    expect(fullHtml).toContain('Panch Witness 1');

    // 4. Verify audit log integrity
    const auditLogPath = path.join(tmpDir, 'audit_log.jsonl');
    const auditContent = await fs.readFile(auditLogPath, 'utf8');
    const auditLines = auditContent.trim().split('\n').map((l) => JSON.parse(l));

    expect(auditLines.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < auditLines.length; i++) {
      expect(auditLines[i].seq).toBe(i + 1);
      if (i > 0) {
        expect(auditLines[i].prev_hash).toBe(auditLines[i - 1].event_hash);
      }
    }
  });
});
