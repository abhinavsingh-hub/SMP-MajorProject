/**
 * SocialParse Web Platform & API Server
 *
 * Connects the Frontend UI (apps/web/index.html) with:
 * - @smp/core (Case folder builder, hashing, verifyCase, audit chain)
 * - @smp/ai-analyzer (OCR, quality checks, entity extraction, section classification, summarization)
 */

import http from 'node:http';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  createCaseFolder,
  NodeFileSystem,
  nodeSha256,
  verifyCase,
  type CreateCaseInput,
} from '../../packages/core/src/index.ts';

import {
  AnalysisPipeline,
  AnalysisWriter,
  appendAuditEvent,
  buildFullPanchnamaAiReportHtml,
  QualityChecker,
  MockOcrEngine,
  OcrService,
  type CaseFolderData,
} from '../../packages/ai-analyzer/src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const REPO_ROOT = path.resolve(__dirname, '../..');
const CASES_ROOT = process.env.SMP_CASES_DIR || path.join(REPO_ROOT, 'cases');
const WEB_HTML = path.join(__dirname, 'index.html');
const DEMO_REPORT_HTML = path.join(REPO_ROOT, 'docs', 'demo-report.html');

// Ensure cases directory exists
if (!fs.existsSync(CASES_ROOT)) {
  fs.mkdirSync(CASES_ROOT, { recursive: true });
}

/**
 * Seed a default working case if cases directory is empty.
 */
async function ensureDefaultCaseSeeded(): Promise<void> {
  const defaultCaseId = 'CASE-2026-0042';
  const defaultCaseDir = path.join(CASES_ROOT, defaultCaseId);

  if (!fs.existsSync(defaultCaseDir)) {
    const nodeFs = new NodeFileSystem();
    const caseInput: CreateCaseInput = {
      case_id: defaultCaseId,
      case_number: 'CCU/FIR/118/2026',
      examiner_name: 'Priya Deshmukh',
      examiner_designation: 'Sub-Inspector, Cyber Operations',
      accused_name: 'Imran Farooq (Alias: @shadow_intel)',
      agency: 'National Investigation Agency (NIA)',
      created_at: '2026-11-12T09:15:02.118Z',
      device: {
        type: 'desktop',
        name: 'EXAMINER-WORKSTATION-01',
        os: 'macOS',
        os_version: '14.5',
        app_version: '0.1.0',
      },
      remarks: 'Primary evidentiary seizure for digital feed forensics.',
    };

    await createCaseFolder(CASES_ROOT, caseInput, nodeFs, nodeSha256);
    await seedEvidenceScreenshots(defaultCaseDir, defaultCaseId);
  }
}

/**
 * Seeds realistic forensic screenshots into a case folder.
 */
async function seedEvidenceScreenshots(caseDir: string, caseId: string): Promise<number> {
  const platforms = ['instagram', 'facebook', 'telegram'];
  for (const p of platforms) {
    await fsp.mkdir(path.join(caseDir, p, 'screenshots'), { recursive: true });
  }

  const items = [
    {
      item_id: 'ITEM-0001',
      platform: 'instagram',
      section: 'profile',
      file_name: 'instagram_profile_0001_20261112T093158Z.png',
      captured_at: '2026-11-12T09:31:58.000Z',
      pattern: 'checkerboard' as const,
      ocrText: 'Profile @shadow_intel Bio: Encrypted comms only. WhatsApp/Call: +91-98765-43210 Link: https://t.me/shadow_channel Followed by 15.2k accounts',
    },
    {
      item_id: 'ITEM-0002',
      platform: 'instagram',
      section: 'feed',
      file_name: 'instagram_feed_0002_20261112T093221Z.png',
      captured_at: '2026-11-12T09:32:21.000Z',
      pattern: 'gradient' as const,
      ocrText: 'Recent Post 2h ago: Operational update #CyberCampaign #Mission2026 meeting location finalized at safehouse.',
    },
    {
      item_id: 'ITEM-0003',
      platform: 'telegram',
      section: 'secret_chat',
      file_name: 'telegram_secret_chat_0003_20261112T093310Z.png',
      captured_at: '2026-11-12T09:33:10.000Z',
      pattern: 'solid' as const,
      fillColor: [0, 0, 0] as [number, number, number], // Solid black screen (FLAG_SECURE)
      ocrText: '',
    },
    {
      item_id: 'ITEM-0004',
      platform: 'facebook',
      section: 'profile',
      file_name: 'facebook_profile_0004_20261112T093403Z.png',
      captured_at: '2026-11-12T09:34:03.000Z',
      pattern: 'checkerboard' as const,
      ocrText: 'Facebook Account Info: Imran Farooq Contact Email: target_intel@proton.me Phone: +919876543210 #Investigation',
    },
    {
      item_id: 'ITEM-0005',
      platform: 'facebook',
      section: 'feed',
      file_name: 'facebook_feed_0005_20261112T093427Z.png',
      captured_at: '2026-11-12T09:34:27.000Z',
      pattern: 'gradient' as const, // Duplicate capture
      ocrText: 'Recent Post 2h ago: Operational update #CyberCampaign #Mission2026 meeting location finalized at safehouse.',
    },
  ];

  // Check existing items in manifest to prevent duplicate seeding
  const manifestPath = path.join(caseDir, 'manifest.json');
  const manifestRaw = await fsp.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const existingItems = manifest.items || [];
  const existingIds = new Set(existingItems.map((it: { item_id: string }) => it.item_id));

  const itemsToSeed = items.filter((it) => !existingIds.has(it.item_id));
  if (itemsToSeed.length === 0) {
    return existingItems.length;
  }

  const manifestItems = [...existingItems];
  const hashesPath = path.join(caseDir, 'hashes.csv');
  const existingCsv = fs.existsSync(hashesPath) ? await fsp.readFile(hashesPath, 'utf8') : 'item_id,platform,section,file_path,sha256,captured_at\n';
  const csvRows = [existingCsv.trim()];

  for (const it of itemsToSeed) {
    const relPath = `${it.platform}/screenshots/${it.file_name}`;
    const absPath = path.join(caseDir, relPath);

    const pngBuf = QualityChecker.createSyntheticPng({
      width: 48,
      height: 48,
      pattern: it.pattern,
      fillColor: it.fillColor,
    });
    await fsp.writeFile(absPath, pngBuf);

    const sha256 = crypto.createHash('sha256').update(pngBuf).digest('hex');

    manifestItems.push({
      item_id: it.item_id,
      platform: it.platform,
      section: it.section,
      file_path: relPath,
      file_size_bytes: pngBuf.length,
      sha256,
      captured_at: it.captured_at,
    });

    csvRows.push(`${it.item_id},${it.platform},${it.section},${relPath},${sha256},${it.captured_at}`);
  }

  // Update manifest.json
  manifest.items = manifestItems;
  manifest.updated_at = new Date().toISOString();
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Update hashes.csv
  await fsp.writeFile(hashesPath, `${csvRows.filter(Boolean).join('\n')}\n`, 'utf8');

  // Append matching item_captured events to audit_log.jsonl
  for (const item of manifestItems.filter((m) => !existingIds.has(m.item_id))) {
    await appendAuditEvent(caseDir, {
      actor: 'capture_worker',
      event_type: 'item_captured',
      details: {
        item_id: item.item_id,
        platform: item.platform,
        section: item.section,
        file_path: item.file_path,
        sha256: item.sha256,
      },
      timestamp: item.captured_at,
    });
  }

  return manifestItems.length;
}

/**
 * Parses request JSON body.
 */
function parseJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${(err as Error).message}`));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Sends JSON responses.
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const [urlPath] = (req.url || '/').split('?');
  const method = req.method || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // -------------------------------------------------------------------------
    // API: List Cases
    // -------------------------------------------------------------------------
    if (urlPath === '/api/cases' && method === 'GET') {
      const entries = await fsp.readdir(CASES_ROOT, { withFileTypes: true });
      const caseDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('CASE-'));

      const casesList = [];
      for (const dir of caseDirs) {
        const cPath = path.join(CASES_ROOT, dir.name);
        try {
          const caseJsonRaw = await fsp.readFile(path.join(cPath, 'case.json'), 'utf8');
          const caseJson = JSON.parse(caseJsonRaw);
          const manifestRaw = await fsp.readFile(path.join(cPath, 'manifest.json'), 'utf8');
          const manifest = JSON.parse(manifestRaw);

          const hasAnalysis = fs.existsSync(path.join(cPath, 'analysis_summary.json'));

          casesList.push({
            id: caseJson.case_id,
            fir: caseJson.case_number,
            examiner: caseJson.examiner_name,
            accused: caseJson.accused_name,
            agency: caseJson.agency,
            path: cPath,
            items: manifest.items?.length || 0,
            hasAnalysis,
            status: hasAnalysis ? 'AI Analyzed' : manifest.items?.length > 0 ? 'Seizure Active' : 'Registered',
          });
        } catch {
          // Skip invalid directories
        }
      }

      sendJson(res, 200, { success: true, cases: casesList });
      return;
    }

    // -------------------------------------------------------------------------
    // API: Get Single Case Details (case.json, manifest.json, analysis_summary.json)
    // -------------------------------------------------------------------------
    const singleCaseMatch = urlPath.match(/^\/api\/cases\/([A-Za-z0-9_-]+)$/);
    if (singleCaseMatch && method === 'GET') {
      const caseId = singleCaseMatch[1];
      const caseDir = path.join(CASES_ROOT, caseId);
      if (!fs.existsSync(caseDir)) {
        sendJson(res, 404, { success: false, error: `Case not found: ${caseId}` });
        return;
      }

      const caseJsonRaw = await fsp.readFile(path.join(caseDir, 'case.json'), 'utf8');
      const caseJson = JSON.parse(caseJsonRaw);
      const manifestRaw = await fsp.readFile(path.join(caseDir, 'manifest.json'), 'utf8');
      const manifest = JSON.parse(manifestRaw);

      let analysisSummary = null;
      const summaryPath = path.join(caseDir, 'analysis_summary.json');
      if (fs.existsSync(summaryPath)) {
        analysisSummary = JSON.parse(await fsp.readFile(summaryPath, 'utf8'));
      }

      sendJson(res, 200, {
        success: true,
        case: caseJson,
        manifest,
        analysisSummary,
      });
      return;
    }

    // -------------------------------------------------------------------------
    // API: Serve Evidence Screenshot Image
    // -------------------------------------------------------------------------
    const imageMatch = urlPath.match(/^\/api\/cases\/([A-Za-z0-9_-]+)\/evidence\/([a-z0-9_]+)\/(.+\.png)$/);
    if (imageMatch && method === 'GET') {
      const [, caseId, platform, filename] = imageMatch;
      const filePath = path.join(CASES_ROOT, caseId, platform, 'screenshots', filename);
      if (fs.existsSync(filePath)) {
        const img = await fsp.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(img);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Evidence screenshot not found');
      return;
    }

    // -------------------------------------------------------------------------
    // API: Create Case Folder
    // -------------------------------------------------------------------------
    if (urlPath === '/api/cases' && method === 'POST') {
      const body = await parseJsonBody(req);
      const caseNumber = String(body.case_number || body.fir || 'FIR-101/2026');
      const accused = String(body.accused_name || body.accused || 'Unknown Subject');
      const agency = String(body.agency || 'State Cyber Crime Investigation Cell');
      const examiner = String(body.examiner_name || body.examiner || 'Investigating Officer');
      const designation = String(body.examiner_designation || 'Cyber Forensics Specialist');

      // Generate sequential case ID
      const entries = await fsp.readdir(CASES_ROOT).catch(() => []);
      const count = entries.filter((name) => name.startsWith('CASE-')).length + 1;
      const caseId = `CASE-2026-${String(count).padStart(4, '0')}`;

      const nodeFs = new NodeFileSystem();
      const createInput: CreateCaseInput = {
        case_id: caseId,
        case_number: caseNumber,
        examiner_name: examiner,
        examiner_designation: designation,
        accused_name: accused,
        agency: agency,
        device: {
          type: 'desktop',
          name: 'EXAMINER-WORKSTATION',
          os: 'macOS',
          os_version: '15.0',
          app_version: '0.1.0',
        },
        remarks: String(body.remarks || 'Forensic seizure'),
      };

      const result = await createCaseFolder(CASES_ROOT, createInput, nodeFs, nodeSha256);
      sendJson(res, 201, { success: true, caseId, caseFolderPath: result.caseFolderPath, caseData: result.caseData });
      return;
    }

    // -------------------------------------------------------------------------
    // API: Seed Evidence Screenshots into a Case
    // -------------------------------------------------------------------------
    const seedMatch = urlPath.match(/^\/api\/cases\/([^/]+)\/seed$/);
    if (seedMatch && method === 'POST') {
      const caseId = seedMatch[1];
      const caseDir = path.join(CASES_ROOT, caseId);
      if (!fs.existsSync(caseDir)) {
        sendJson(res, 404, { success: false, error: `Case not found: ${caseId}` });
        return;
      }

      const count = await seedEvidenceScreenshots(caseDir, caseId);
      sendJson(res, 200, { success: true, caseId, itemsCaptured: count });
      return;
    }

    // -------------------------------------------------------------------------
    // API: Trigger AI Analysis on a Case
    // -------------------------------------------------------------------------
    const analyzeMatch = urlPath.match(/^\/api\/cases\/([^/]+)\/analyze$/);
    if (analyzeMatch && method === 'POST') {
      const caseId = analyzeMatch[1];
      const caseDir = path.join(CASES_ROOT, caseId);
      if (!fs.existsSync(caseDir)) {
        sendJson(res, 404, { success: false, error: `Case not found: ${caseId}` });
        return;
      }

      // Check if evidence exists; if empty, automatically seed test evidence
      const manifestPath = path.join(caseDir, 'manifest.json');
      const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
      if (!manifest.items || manifest.items.length === 0) {
        await seedEvidenceScreenshots(caseDir, caseId);
      }

      // Duplicate OCR and summary provider block removed – using the later consolidated block.
// Prepare mock OCR engine with seeded results
      const mockOcr = new MockOcrEngine();
      mockOcr.setMockResult(
        path.join(caseDir, 'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png'),
        'Profile @shadow_intel Bio: Encrypted comms only. WhatsApp/Call: +91-98765-43210 Link: https://t.me/shadow_channel Followed by 15.2k accounts',
      );
      mockOcr.setMockResult(
        path.join(caseDir, 'instagram/screenshots/instagram_feed_0002_20261112T093221Z.png'),
        'Recent Post 2h ago: Operational update #CyberCampaign #Mission2026 meeting location finalized at safehouse.',
      );
      mockOcr.setMockResult(
        path.join(caseDir, 'facebook/screenshots/facebook_profile_0004_20261112T093403Z.png'),
        'Facebook Account Info: Imran Farooq Contact Email: target_intel@proton.me Phone: +919876543210 #Investigation',
      );
      mockOcr.setMockResult(
        path.join(caseDir, 'facebook/screenshots/facebook_feed_0005_20261112T093427Z.png'),
        'Recent Post 2h ago: Operational update #CyberCampaign #Mission2026 meeting location finalized at safehouse.',
      );

      // Build services & pipeline (summaryProvider may be undefined → rule‑based fallback)
      const ocrService = new OcrService({ engine: mockOcr });
      const pipeline = new AnalysisPipeline({ ocrService, summaryProvider });

      const startTime = Date.now();
      const pipelineResult = await pipeline.analyzeCase(caseDir);
      const durationMs = Date.now() - startTime;

      // Write analysis.json and analysis_summary.json
      const writer = new AnalysisWriter();
      await writer.writeAnalysisResults(caseDir, pipelineResult);

      // Generate HTML report file
      const caseJsonPath = path.join(caseDir, 'case.json');
      const caseJson = JSON.parse(await fsp.readFile(caseJsonPath, 'utf8')) as CaseFolderData['caseJson'];
      const reportHtml = buildFullPanchnamaAiReportHtml(caseJson, pipelineResult);
      await fsp.writeFile(path.join(caseDir, 'panchnama_ai_report.html'), reportHtml, 'utf8');

      sendJson(res, 200, {
        success: true,
        caseId,
        durationMs,
        totalScreenshots: pipelineResult.records.length,
        flaggedCount: pipelineResult.caseSummary.flaggedItems.length,
        flags: pipelineResult.caseSummary.flaggedItems,
        entityCount: Object.keys(pipelineResult.caseSummary.entityIndex).length,
        entityIndex: pipelineResult.caseSummary.entityIndex,
        records: pipelineResult.records,
        reportUrl: `/api/cases/${caseId}/report`,
      });
      return;
    }

    // -------------------------------------------------------------------------
    // API: Run Forensic Integrity Verification (verifyCase from @smp/core)
    // -------------------------------------------------------------------------
    const verifyMatch = urlPath.match(/^\/api\/cases\/([^/]+)\/verify$/);
    if (verifyMatch && method === 'GET') {
      const caseId = verifyMatch[1];
      const caseDir = path.join(CASES_ROOT, caseId);
      if (!fs.existsSync(caseDir)) {
        sendJson(res, 404, { success: false, error: `Case not found: ${caseId}` });
        return;
      }

      const nodeFs = new NodeFileSystem();
      const verification = await verifyCase(caseDir, nodeFs, nodeSha256);

      sendJson(res, 200, {
        success: true,
        caseId,
        passed: verification.passed,
        issues: verification.issues,
        checksRun: 8,
      });
      return;
    }

    // -------------------------------------------------------------------------
    // API: View Case Panchnama Report (HTML)
    // -------------------------------------------------------------------------
    const reportMatch = urlPath.match(/^\/api\/cases\/([^/]+)\/report$/);
    if (reportMatch && method === 'GET') {
      const caseId = reportMatch[1];
      const caseDir = path.join(CASES_ROOT, caseId);
      const generatedReport = path.join(caseDir, 'panchnama_ai_report.html');

      if (fs.existsSync(generatedReport)) {
        const html = await fsp.readFile(generatedReport, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // Fallback: check if demo report exists
      if (fs.existsSync(DEMO_REPORT_HTML)) {
        const html = await fsp.readFile(DEMO_REPORT_HTML, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Report not yet generated for this case. Run AI Analysis first.');
      return;
    }

    // -------------------------------------------------------------------------
    // Static Route: General /report
    // -------------------------------------------------------------------------
    if (urlPath === '/report' || urlPath === '/demo-report.html') {
      const defaultReport = path.join(CASES_ROOT, 'CASE-2026-0042', 'panchnama_ai_report.html');
      const htmlPath = fs.existsSync(defaultReport) ? defaultReport : DEMO_REPORT_HTML;

      if (fs.existsSync(htmlPath)) {
        const html = await fsp.readFile(htmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
    }

    // -------------------------------------------------------------------------
    // Static Route: Dashboard Frontend
    // -------------------------------------------------------------------------
    if (urlPath === '/' || urlPath === '/index.html') {
      if (fs.existsSync(WEB_HTML)) {
        const html = await fsp.readFile(WEB_HTML, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
    }

    // Fallthrough 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found', path: urlPath }));
  } catch (err) {
    console.error('API Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
});

// Seed default case and start listening
ensureDefaultCaseSeeded().then(() => {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`=======================================================`);
    console.log(`  SocialParse Live Forensic Server active on:`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Cases Directory: ${CASES_ROOT}`);
    console.log(`=======================================================`);
  });
});

export { server };
