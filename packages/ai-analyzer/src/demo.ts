/**
 * SocialParse AI Analyzer - Standalone Demonstration Script
 *
 * Demonstrates the full multimodal AI analysis and Panchnama documentation pipeline.
 * Usage: npm run demo -w @smp/ai-analyzer
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AnalysisPipeline,
  AnalysisWriter,
  buildFullPanchnamaAiReportHtml,
  MockOcrEngine,
  OcrService,
  QualityChecker,
} from './index.js';

async function runDemo(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  SocialParse: AI Analysis & Panchnama Documentation Layer');
  console.log('  National Investigation Agency (NIA) - Anti-Cyber Terrorism');
  console.log('='.repeat(70));

  const demoDir = path.resolve('.demo-output', 'CASE-2026-0042');
  await fs.rm(demoDir, { recursive: true, force: true });
  await fs.mkdir(demoDir, { recursive: true });

  console.log(`\n[1/5] Initializing evidentiary case directory: ${demoDir}`);

  const caseJson = {
    schema_version: '1.0',
    case_id: 'CASE-2026-0042',
    case_number: 'NIA/ACTD/FIR-118/2026',
    examiner_name: 'Priya Deshmukh',
    examiner_designation: 'Sub-Inspector, Cyber Operations',
    accused_name: 'Imran Farooq (Alias: @shadow_intel)',
    agency: 'National Investigation Agency (NIA)',
    created_at: new Date().toISOString(),
    device: {
      type: 'desktop' as const,
      name: 'EXAMINER-WORKSTATION-01',
      os: 'macOS',
      os_version: '14.5',
      app_version: '0.1.0',
    },
    remarks: 'Evidence extracted from accused mobile & desktop sessions.',
  };

  const platforms = ['instagram', 'facebook', 'telegram'];
  for (const p of platforms) {
    await fs.mkdir(path.join(demoDir, p, 'screenshots'), { recursive: true });
  }

  // Create mock evidentiary screenshots
  const items = [
    {
      item_id: 'ITEM-0001',
      platform: 'instagram',
      section: 'profile',
      file_name: 'instagram_profile_0001_20261112T093158Z.png',
      pattern: 'checkerboard' as const,
      ocrText: 'Profile @shadow_intel Bio: Encrypted comms only. WhatsApp/Call: +91-98765-43210 Link: https://t.me/shadow_channel Followed by 15.2k accounts',
    },
    {
      item_id: 'ITEM-0002',
      platform: 'instagram',
      section: 'feed',
      file_name: 'instagram_feed_0002_20261112T093221Z.png',
      pattern: 'gradient' as const,
      ocrText: 'Recent Post 2h ago: Operational update #CyberCampaign #Mission2026 meeting location finalized at safehouse.',
    },
    {
      item_id: 'ITEM-0003',
      platform: 'telegram',
      section: 'secret_chat',
      file_name: 'telegram_secret_chat_0003_20261112T093310Z.png',
      pattern: 'solid' as const,
      fillColor: [0, 0, 0] as [number, number, number], // Solid black screen (FLAG_SECURE)
      ocrText: '',
    },
    {
      item_id: 'ITEM-0004',
      platform: 'facebook',
      section: 'profile',
      file_name: 'facebook_profile_0004_20261112T093403Z.png',
      pattern: 'checkerboard' as const,
      ocrText: 'Facebook Account Info: Imran Farooq Contact Email: target_intel@proton.me Phone: +919876543210 #Investigation',
    },
    {
      item_id: 'ITEM-0005',
      platform: 'facebook',
      section: 'feed',
      file_name: 'facebook_feed_0005_20261112T093427Z.png',
      pattern: 'gradient' as const, // Duplicate of ITEM-0002
      ocrText: 'Recent Post 2h ago: Operational update #CyberCampaign #Mission2026 meeting location finalized at safehouse.',
    },
  ];

  const manifestItems = [];
  const csvRows = ['item_id,platform,section,file_path,sha256,captured_at'];
  const mockOcr = new MockOcrEngine();

  for (const it of items) {
    const relPath = `${it.platform}/screenshots/${it.file_name}`;
    const absPath = path.join(demoDir, relPath);

    const pngBuf = QualityChecker.createSyntheticPng({
      width: 48,
      height: 48,
      pattern: it.pattern,
      fillColor: it.fillColor,
    });
    await fs.writeFile(absPath, pngBuf);

    const sha256 = crypto.createHash('sha256').update(pngBuf).digest('hex');
    const captured_at = new Date().toISOString();

    manifestItems.push({
      item_id: it.item_id,
      platform: it.platform,
      section: it.section,
      file_path: relPath,
      file_size_bytes: pngBuf.length,
      sha256,
      captured_at,
    });

    csvRows.push(`${it.item_id},${it.platform},${it.section},${relPath},${sha256},${captured_at}`);
    mockOcr.setMockResult(absPath, it.ocrText);
  }

  const manifest = {
    schema_version: '1.0',
    case_id: caseJson.case_id,
    hash_algorithm: 'SHA-256',
    created_at: caseJson.created_at,
    updated_at: new Date().toISOString(),
    items: manifestItems,
  };

  await fs.writeFile(path.join(demoDir, 'case.json'), JSON.stringify(caseJson, null, 2));
  await fs.writeFile(path.join(demoDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(demoDir, 'hashes.csv'), `${csvRows.join('\n')}\n`);

  console.log(`[2/5] Generated case metadata and ${manifestItems.length} evidence screenshots.`);

  // 3. Execute Analysis Pipeline
  console.log('\n[3/5] Running multimodal AI analysis pipeline...');
  const ocrService = new OcrService({ engine: mockOcr });
  const pipeline = new AnalysisPipeline({ ocrService });

  const startTime = Date.now();
  const pipelineResult = await pipeline.analyzeCase(demoDir);
  const durationMs = Date.now() - startTime;
  console.log(`Pipeline completed in ${durationMs}ms.`);

  // 4. Write analysis outputs
  console.log('\n[4/5] Persisting platform analysis.json and case analysis_summary.json...');
  const writer = new AnalysisWriter();
  const writeRes = await writer.writeAnalysisResults(demoDir, pipelineResult);
  console.log(`Written ${writeRes.platformFilesWritten.length} platform analysis files.`);
  console.log(`Written summary to: ${writeRes.caseSummaryFile}`);

  // 5. Generate full Panchnama report HTML
  console.log('\n[5/5] Generating Panchnama-style printable HTML documentation...');
  const reportHtml = buildFullPanchnamaAiReportHtml(caseJson, pipelineResult);
  const reportPath = path.join(demoDir, 'panchnama_ai_report.html');
  await fs.writeFile(reportPath, reportHtml, 'utf8');
  console.log(`Report generated successfully at: ${reportPath}`);

  // Display findings summary in console
  console.log('\n' + '='.repeat(70));
  console.log('  ANALYSIS FINDINGS SUMMARY');
  console.log('='.repeat(70));
  console.log(`Case ID:              ${pipelineResult.caseSummary.caseId}`);
  console.log(`Total Screenshots:    ${pipelineResult.caseSummary.totalScreenshots}`);
  console.log(`Flagged Alerts:       ${pipelineResult.caseSummary.flaggedItems.length}`);
  console.log(`Cross-Platform Keys:  ${Object.keys(pipelineResult.caseSummary.entityIndex).length} entities`);

  console.log('\nFlagged Items (Requiring Forensic Verification):');
  for (const f of pipelineResult.caseSummary.flaggedItems) {
    console.log(`  - [${f.screenshotId}] (${f.platform.toUpperCase()}): ${f.flags.join(', ')}`);
    console.log(`    Reason: ${f.summary}`);
  }

  console.log('\nCross-Platform Entity Correlations:');
  for (const [key, ent] of Object.entries(pipelineResult.caseSummary.entityIndex)) {
    if (ent.appearances.length > 1) {
      const places = ent.appearances.map((a) => `${a.platform}:${a.screenshotId}`).join(', ');
      console.log(`  - MATCH [${key}]: Observed across [${places}]`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Demo completed. Open ${reportPath} in any browser to review.`);
  console.log('='.repeat(70) + '\n');
}

runDemo().catch((err) => {
  console.error('Demo execution failed:', err);
  process.exit(1);
});
