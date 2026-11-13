/**
 * Unit tests for P3-08: HTML Report Template.
 *
 * Requirements:
 * - buildReportHtml(caseFolder): cover page, table of contents, one section per platform,
 *   screenshots with captions.
 * - Print-friendly CSS (A4, page breaks).
 * - Include demo data so the HTML can be opened in a browser.
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
  buildReportHtml,
  buildDemoReportHtml,
  renderReportHtml,
  DEMO_CASE,
} from '../src/index.ts';

// ---------------------------------------------------------------------------
// Temp directory setup
// ---------------------------------------------------------------------------

let tmpRoot: string;

before(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'smp-p3-08-'));
});

after(async () => {
  await fsp.rm(tmpRoot, { recursive: true, force: true });
});

async function makeTempDir(label: string): Promise<string> {
  const dir = path.join(tmpRoot, label + '-' + Date.now());
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDemoReportHtml', () => {
  it('generates a complete valid standalone HTML document from demo data', () => {
    const html = buildDemoReportHtml();

    // 1. Structure
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<html lang="en">'));
    assert.ok(html.includes('</html>'));

    // 2. Cover page elements
    assert.ok(html.includes('CASE-2026-0042'), 'Must include Case ID');
    assert.ok(html.includes('CCU/FIR/118/2026'), 'Must include FIR / Case Number');
    assert.ok(html.includes('Priya Deshmukh'), 'Must include examiner name');
    assert.ok(html.includes('Sub-Inspector'), 'Must include examiner designation');
    assert.ok(html.includes('Sample Accused'), 'Must include accused name');
    assert.ok(html.includes('Cyber Crime Investigation Unit'), 'Must include agency');
    assert.ok(html.includes('EXAMINER-MAC-01'), 'Must include device name');
    assert.ok(html.includes('macOS 14.5'), 'Must include device OS');
    assert.ok(html.includes('Forensic evidence captured pursuant to Section 65B'), 'Must include remarks');

    // 3. Table of Contents
    assert.ok(html.includes('Evidence Inventory Summary'), 'Must have TOC section');
    assert.ok(html.includes('#platform-instagram'), 'Must have Instagram anchor link');
    assert.ok(html.includes('#platform-facebook'), 'Must have Facebook anchor link');

    // 4. Platform sections & screenshots
    assert.ok(html.includes('Platform Evidence: INSTAGRAM'));
    assert.ok(html.includes('Platform Evidence: FACEBOOK'));

    // Screenshot captions
    assert.ok(html.includes('ITEM-0001'));
    assert.ok(html.includes('ITEM-0002'));
    assert.ok(html.includes('ITEM-0003'));
    assert.ok(html.includes('ITEM-0004'));
    assert.ok(html.includes('db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376'));

    // 5. Print-friendly CSS
    assert.ok(html.includes('@media print'));
    assert.ok(html.includes('size: A4'));
    assert.ok(html.includes('page-break-after: always'));
  });

  it('allows customizing the report title', () => {
    const customTitle = 'Cyber Crime Special Branch Forensic Audit';
    const html = buildDemoReportHtml({ title: customTitle });
    assert.ok(html.includes(`<h1 class="report-title">${customTitle}</h1>`));
  });
});

describe('buildReportHtml with FileSystem', () => {
  it('builds HTML report directly from a case folder on disk', async () => {
    const testDir = await makeTempDir('report-from-case');
    const fs = new NodeFileSystem();

    // 1. Create a case
    const { caseFolderPath } = await createCaseFolder(
      testDir,
      DEMO_CASE,
      fs,
      nodeSha256,
    );

    // 2. Record screenshot
    const fileBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 55, 66, 77]);
    await recordScreenshot(
      caseFolderPath,
      {
        platform: 'instagram',
        section: 'profile',
        fileContent: fileBytes,
        capturedAt: '2026-11-12T09:31:58.311Z',
      },
      fs,
      nodeSha256,
    );

    // 3. Build report
    const html = await buildReportHtml(caseFolderPath, fs);

    assert.ok(html.includes('CASE-2026-0042'));
    assert.ok(html.includes('ITEM-0001'));
    assert.ok(html.includes('data:image/png;base64,'));
    assert.ok(html.includes('instagram/screenshots/'));
  });

  it('throws error if case.json or manifest.json are missing', async () => {
    const testDir = await makeTempDir('report-missing-case');
    const fs = new NodeFileSystem();

    await assert.rejects(
      () => buildReportHtml(testDir, fs),
      /case\.json not found/,
    );
  });
});

describe('renderReportHtml with empty case', () => {
  it('handles empty case with zero items gracefully', () => {
    const html = renderReportHtml(DEMO_CASE, []);
    assert.ok(html.includes('No evidence items recorded in this case'));
  });
});
