import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';

import {
  createCaseFolder,
  NodeFileSystem,
  nodeSha256,
  verifyCase,
  type CreateCaseInput,
} from '@smp/core';

import {
  AnalysisPipeline,
  AnalysisWriter,
  appendAuditEvent,
  buildFullPanchnamaAiReportHtml,
  QualityChecker,
  MockOcrEngine,
  OcrService,
  type CaseFolderData,
} from '../src/index.ts';

describe('Full-Stack Web API & Forensic Integration (P4-19)', () => {
  it('integrates case creation, evidence seeding, AI analysis, 8-point verification, and report', async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smp-web-test-'));

    try {
      const nodeFs = new NodeFileSystem();
      const caseId = 'CASE-2026-0099';
      const caseDir = path.join(tmpDir, caseId);

      const caseInput: CreateCaseInput = {
        case_id: caseId,
        case_number: 'FIR-TEST/2026',
        examiner_name: 'Inspector Vikram Singh',
        examiner_designation: 'Cyber Forensics Unit Lead',
        accused_name: 'Target Accused',
        agency: 'NIA Anti-Cyber Terrorism Division',
        created_at: '2026-11-12T09:15:00.000Z',
        device: {
          type: 'desktop',
          name: 'WORKSTATION-TEST-01',
          os: 'macOS',
          os_version: '15.0',
          app_version: '0.1.0',
        },
        remarks: 'Automated integration verification case.',
      };

      // 1. Create Case Folder via @smp/core
      const createRes = await createCaseFolder(tmpDir, caseInput, nodeFs, nodeSha256);
      expect(createRes.caseData.case_id).toBe(caseId);
      expect(fs.existsSync(path.join(caseDir, 'case.json'))).toBe(true);
      expect(fs.existsSync(path.join(caseDir, 'manifest.json'))).toBe(true);

      // 2. Seed Evidence Screenshots with realistic data
      await fsp.mkdir(path.join(caseDir, 'instagram/screenshots'), { recursive: true });
      await fsp.mkdir(path.join(caseDir, 'telegram/screenshots'), { recursive: true });

      const item1Png = QualityChecker.createSyntheticPng({ width: 32, height: 32, pattern: 'checkerboard' });
      const item1Sha = crypto.createHash('sha256').update(item1Png).digest('hex');
      const item1Path = 'instagram/screenshots/instagram_profile_0001_20261112T092000Z.png';
      await fsp.writeFile(path.join(caseDir, item1Path), item1Png);

      const item2Png = QualityChecker.createSyntheticPng({ width: 32, height: 32, pattern: 'solid', fillColor: [0, 0, 0] });
      const item2Sha = crypto.createHash('sha256').update(item2Png).digest('hex');
      const item2Path = 'telegram/screenshots/telegram_secret_chat_0002_20261112T092100Z.png';
      await fsp.writeFile(path.join(caseDir, item2Path), item2Png);

      const manifestItems = [
        {
          item_id: 'ITEM-0001',
          platform: 'instagram',
          section: 'profile',
          file_path: item1Path,
          file_size_bytes: item1Png.length,
          sha256: item1Sha,
          captured_at: '2026-11-12T09:20:00.000Z',
        },
        {
          item_id: 'ITEM-0002',
          platform: 'telegram',
          section: 'secret_chat',
          file_path: item2Path,
          file_size_bytes: item2Png.length,
          sha256: item2Sha,
          captured_at: '2026-11-12T09:21:00.000Z',
        },
      ];

      // Update manifest.json & hashes.csv
      const manifestPath = path.join(caseDir, 'manifest.json');
      const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
      manifest.items = manifestItems;
      manifest.updated_at = '2026-11-12T09:22:00.000Z';
      await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

      const csvContent = [
        'item_id,platform,section,file_path,sha256,captured_at',
        `ITEM-0001,instagram,profile,${item1Path},${item1Sha},2026-11-12T09:20:00.000Z`,
        `ITEM-0002,telegram,secret_chat,${item2Path},${item2Sha},2026-11-12T09:21:00.000Z`,
      ].join('\n') + '\n';
      await fsp.writeFile(path.join(caseDir, 'hashes.csv'), csvContent, 'utf8');

      // Append item_captured audit events
      for (const it of manifestItems) {
        await appendAuditEvent(caseDir, {
          actor: 'capture_worker',
          event_type: 'item_captured',
          details: {
            item_id: it.item_id,
            platform: it.platform,
            section: it.section,
            file_path: it.file_path,
            sha256: it.sha256,
          },
          timestamp: it.captured_at,
        });
      }

      // 3. Verify Forensic Integrity before AI analysis
      const preVerify = await verifyCase(caseDir, nodeFs, nodeSha256);
      expect(preVerify.passed).toBe(true);
      expect(preVerify.issues).toHaveLength(0);

      // 4. Run AI Multimodal Pipeline
      const mockOcr = new MockOcrEngine();
      mockOcr.setMockResult(
        path.join(caseDir, item1Path),
        'Target Profile @shadow_agent Contact: target@secure.mail Phone: +919123456789 #CyberInvestigation',
      );
      mockOcr.setMockResult(path.join(caseDir, item2Path), '');

      const ocrService = new OcrService({ engine: mockOcr });
      const pipeline = new AnalysisPipeline({ ocrService });

      const pipelineResult = await pipeline.analyzeCase(caseDir);
      expect(pipelineResult.records).toHaveLength(2);

      // Verify FLAG_SECURE_BLOCKED was detected on solid black screen
      const blackScreenRecord = pipelineResult.records.find((r) => r.screenshotId === 'ITEM-0002');
      expect(blackScreenRecord?.flags).toContain('FLAG_SECURE_BLOCKED');

      // Verify Entity Extraction
      const profileRecord = pipelineResult.records.find((r) => r.screenshotId === 'ITEM-0001');
      const entityValues = profileRecord?.entities.map((e) => e.value) || [];
      expect(entityValues).toContain('@shadow_agent');
      expect(entityValues).toContain('target@secure.mail');

      // 5. Persist Analysis Output
      const writer = new AnalysisWriter();
      await writer.writeAnalysisResults(caseDir, pipelineResult);
      expect(fs.existsSync(path.join(caseDir, 'analysis_summary.json'))).toBe(true);

      // 6. Generate Full Panchnama Report HTML
      const caseJson = JSON.parse(await fsp.readFile(path.join(caseDir, 'case.json'), 'utf8')) as CaseFolderData['caseJson'];
      const reportHtml = buildFullPanchnamaAiReportHtml(caseJson, pipelineResult);
      expect(reportHtml).toContain('MACHINE-GENERATED, EXAMINER MUST VERIFY');
      expect(reportHtml).toContain('Section 65B');
      expect(reportHtml).toContain('FLAG_SECURE_BLOCKED');

      // 7. Verify Forensic Integrity AFTER AI analysis remains 100% intact!
      const postVerify = await verifyCase(caseDir, nodeFs, nodeSha256);
      expect(postVerify.passed).toBe(true);
      expect(postVerify.issues).toHaveLength(0);
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
