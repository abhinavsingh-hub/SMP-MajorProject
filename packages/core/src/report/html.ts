/**
 * HTML Report Generator for SocialParse Cases.
 *
 * Implements P3-08:
 * - Cover page (case details, examiner, accused, device info, remarks)
 * - Table of contents / executive index (evidence inventory by platform)
 * - Platform sections with screenshot cards, metadata captions, and SHA-256 hashes
 * - Print-friendly CSS targeting A4 pages with clean page breaks
 * - Demo data and standalone renderer for browser viewing
 */

import type { Case, EvidenceItem } from '../schemas/index.ts';
import type { FileSystem } from '../fs/interface.ts';

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

/** Minimal 1x1 transparent PNG as base64 for fallback/demo */
export const SAMPLE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const DEMO_CASE: Case = {
  schema_version: '1.0',
  case_id: 'CASE-2026-0042',
  case_number: 'CCU/FIR/118/2026',
  examiner_name: 'Priya Deshmukh',
  examiner_designation: 'Sub-Inspector',
  accused_name: 'Sample Accused',
  agency: 'Cyber Crime Investigation Unit, Zone 1',
  created_at: '2026-11-12T09:15:02.118Z',
  device: {
    type: 'desktop',
    name: 'EXAMINER-MAC-01',
    os: 'macOS',
    os_version: '14.5',
    app_version: '0.1.0',
  },
  remarks:
    'Forensic evidence captured pursuant to Section 65B of the Indian Evidence Act / Section 63 of Bharatiya Sakshya Adhiniyam.',
};

export const DEMO_ITEMS: EvidenceItem[] = [
  {
    item_id: 'ITEM-0001',
    platform: 'instagram',
    section: 'profile',
    file_path:
      'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png',
    file_size_bytes: 482113,
    sha256:
      'db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376',
    captured_at: '2026-11-12T09:31:58.311Z',
  },
  {
    item_id: 'ITEM-0002',
    platform: 'instagram',
    section: 'feed',
    file_path:
      'instagram/screenshots/instagram_feed_0002_20261112T093221Z.png',
    file_size_bytes: 391840,
    sha256:
      '1071ed51cec7821291b6ea25cbf6a651185eef697b5eac6199d9a7ad656e4324',
    captured_at: '2026-11-12T09:32:21.640Z',
  },
  {
    item_id: 'ITEM-0003',
    platform: 'facebook',
    section: 'profile',
    file_path:
      'facebook/screenshots/facebook_profile_0003_20261112T093403Z.png',
    file_size_bytes: 455207,
    sha256:
      'a6a9af4e85fa76d00a927cf62b0170d4a5208f61eda9c35aa9494bbfb84fe7fc',
    captured_at: '2026-11-12T09:34:03.077Z',
  },
  {
    item_id: 'ITEM-0004',
    platform: 'facebook',
    section: 'feed',
    file_path:
      'facebook/screenshots/facebook_feed_0004_20261112T093427Z.png',
    file_size_bytes: 402968,
    sha256:
      '567bc74bd1eb3541522088cd1df4c5b54c9d4c516c2af50ae61742df69b7823b',
    captured_at: '2026-11-12T09:34:27.953Z',
  },
];

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

// ---------------------------------------------------------------------------
// HTML escape utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// CSS styles for screen and A4 print
// ---------------------------------------------------------------------------

const REPORT_CSS = `
  :root {
    --primary: #0f172a;
    --primary-light: #1e293b;
    --accent: #2563eb;
    --accent-light: #eff6ff;
    --border: #e2e8f0;
    --text: #334155;
    --text-muted: #64748b;
    --bg-card: #f8fafc;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--text);
    background: #f1f5f9;
    line-height: 1.5;
    padding: 24px;
  }

  .report-container {
    max-width: 900px;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .page {
    padding: 40px 48px;
  }

  .page-break {
    page-break-after: always;
    break-after: page;
  }

  .no-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Cover Page */
  .cover-header {
    border-bottom: 3px solid var(--accent);
    padding-bottom: 24px;
    margin-bottom: 32px;
  }

  .badge-tag {
    display: inline-block;
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 4px;
    margin-bottom: 12px;
  }

  h1.report-title {
    font-size: 26px;
    color: var(--primary);
    font-weight: 800;
    line-height: 1.25;
    margin-bottom: 8px;
  }

  .report-subtitle {
    font-size: 14px;
    color: var(--text-muted);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
    margin-bottom: 32px;
  }

  .meta-item {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 16px;
  }

  .meta-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    margin-bottom: 4px;
    font-weight: 600;
  }

  .meta-value {
    font-size: 14px;
    color: var(--primary);
    font-weight: 600;
    word-break: break-all;
  }

  .meta-item.full-width {
    grid-column: 1 / -1;
  }

  /* Index / Summary Table */
  h2.section-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary);
    border-bottom: 2px solid var(--border);
    padding-bottom: 8px;
    margin: 28px 0 16px 0;
  }

  .toc-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 32px;
    font-size: 13px;
  }

  .toc-table th {
    background: var(--bg-card);
    color: var(--primary);
    text-align: left;
    padding: 10px 14px;
    border: 1px solid var(--border);
    font-weight: 600;
  }

  .toc-table td {
    padding: 10px 14px;
    border: 1px solid var(--border);
    color: var(--text);
  }

  .toc-table tr:hover {
    background: #f8fafc;
  }

  .platform-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    background: #e2e8f0;
    color: var(--primary);
  }

  /* Screenshot Evidence Cards */
  .screenshot-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 32px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    overflow: hidden;
  }

  .screenshot-header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .screenshot-title {
    font-weight: 700;
    color: var(--primary);
    font-size: 14px;
  }

  .screenshot-image-container {
    padding: 16px;
    background: #f8fafc;
    text-align: center;
    border-bottom: 1px solid var(--border);
  }

  .screenshot-img {
    max-width: 100%;
    max-height: 480px;
    height: auto;
    border: 1px solid var(--border);
    border-radius: 4px;
    display: inline-block;
    background: #ffffff;
  }

  .caption-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .caption-table td {
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
  }

  .caption-table tr:last-child td {
    border-bottom: none;
  }

  .caption-key {
    width: 25%;
    font-weight: 600;
    color: var(--text-muted);
  }

  .caption-val {
    width: 75%;
    color: var(--primary);
    word-break: break-all;
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
  }

  /* Print Styles */
  @media print {
    body {
      background: #ffffff !important;
      padding: 0 !important;
    }

    .report-container {
      max-width: 100% !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }

    .page {
      padding: 20mm !important;
    }

    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    .screenshot-img {
      max-height: 380px !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// Render function
// ---------------------------------------------------------------------------

export interface BuildReportOptions {
  /** Custom report title (defaults to "SocialParse Forensic Evidence Report") */
  title?: string;
  /** Map of relative file_path -> base64 Data URI (e.g. data:image/png;base64,...) */
  imagesBase64?: Record<string, string>;
}

/**
 * Builds the complete standalone HTML string for a case report.
 */
export function renderReportHtml(
  caseData: Case,
  items: EvidenceItem[],
  options?: BuildReportOptions,
): string {
  const title = options?.title ?? 'Digital Evidence Examination Report';
  const images = options?.imagesBase64 ?? {};

  // Group items by platform
  const itemsByPlatform = new Map<string, EvidenceItem[]>();
  for (const item of items) {
    const list = itemsByPlatform.get(item.platform) || [];
    list.push(item);
    itemsByPlatform.set(item.platform, list);
  }

  // Build Table of Contents rows
  const tocRows = Array.from(itemsByPlatform.entries())
    .map(([platform, platItems]) => {
      const sections = Array.from(new Set(platItems.map((it) => it.section))).join(
        ', ',
      );
      return `
      <tr>
        <td><a href="#platform-${escapeHtml(platform)}" style="color:var(--accent);text-decoration:none;font-weight:600;"><span class="platform-pill">${escapeHtml(platform)}</span></a></td>
        <td>${escapeHtml(sections)}</td>
        <td style="text-align:center;">${platItems.length}</td>
        <td style="text-align:right;"><a href="#platform-${escapeHtml(platform)}" style="color:var(--accent);">View Section &rarr;</a></td>
      </tr>
    `;
    })
    .join('\n');

  // Build Platform Sections
  const platformSectionsHtml = Array.from(itemsByPlatform.entries())
    .map(([platform, platItems]) => {
      const cardsHtml = platItems
        .map((item) => {
          // Use base64 data URI if provided, or fallback to file_path or SAMPLE_PNG
          const imgSrc = images[item.file_path] || SAMPLE_PNG_BASE64;
          return `
        <div class="screenshot-card no-break">
          <div class="screenshot-header">
            <span class="screenshot-title">${escapeHtml(item.item_id)}: ${escapeHtml(item.platform.toUpperCase())} &mdash; ${escapeHtml(item.section)}</span>
            <span class="badge-tag">${escapeHtml(item.captured_at)}</span>
          </div>
          <div class="screenshot-image-container">
            <img class="screenshot-img" src="${escapeHtml(imgSrc)}" alt="Screenshot ${escapeHtml(item.item_id)}" />
          </div>
          <table class="caption-table">
            <tr>
              <td class="caption-key">Item ID</td>
              <td class="caption-val"><strong>${escapeHtml(item.item_id)}</strong></td>
            </tr>
            <tr>
              <td class="caption-key">Platform / Section</td>
              <td class="caption-val">${escapeHtml(item.platform)} / ${escapeHtml(item.section)}</td>
            </tr>
            <tr>
              <td class="caption-key">Capture Timestamp</td>
              <td class="caption-val">${escapeHtml(item.captured_at)} (UTC)</td>
            </tr>
            <tr>
              <td class="caption-key">File Path</td>
              <td class="caption-val mono">${escapeHtml(item.file_path)}</td>
            </tr>
            <tr>
              <td class="caption-key">File Size</td>
              <td class="caption-val">${item.file_size_bytes.toLocaleString()} bytes</td>
            </tr>
            <tr>
              <td class="caption-key">SHA-256 Hash</td>
              <td class="caption-val mono">${escapeHtml(item.sha256)}</td>
            </tr>
          </table>
        </div>
      `;
        })
        .join('\n');

      return `
      <section id="platform-${escapeHtml(platform)}" class="platform-section page-break">
        <h2 class="section-title">Platform Evidence: ${escapeHtml(platform.toUpperCase())} (${platItems.length} items)</h2>
        ${cardsHtml}
      </section>
    `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - ${escapeHtml(caseData.case_id)}</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
  <div class="report-container">
    <!-- PAGE 1: COVER PAGE -->
    <div class="page cover-page page-break">
      <div class="cover-header">
        <span class="badge-tag">Official Evidence Examination Record</span>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">Generated by SocialParse &bull; Tamper-Evident Digital Forensics Report</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Case ID</div>
          <div class="meta-value">${escapeHtml(caseData.case_id)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">FIR / Case Number</div>
          <div class="meta-value">${escapeHtml(caseData.case_number)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Investigating Agency</div>
          <div class="meta-value">${escapeHtml(caseData.agency)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Examiner Details</div>
          <div class="meta-value">${escapeHtml(caseData.examiner_name)}, ${escapeHtml(caseData.examiner_designation)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Name of Accused / Target</div>
          <div class="meta-value">${escapeHtml(caseData.accused_name)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Case Creation Date (UTC)</div>
          <div class="meta-value">${escapeHtml(caseData.created_at)}</div>
        </div>
        <div class="meta-item full-width">
          <div class="meta-label">Examination Device</div>
          <div class="meta-value">
            ${escapeHtml(caseData.device.name)} &bull; ${escapeHtml(caseData.device.os)} ${escapeHtml(caseData.device.os_version)} &bull; App v${escapeHtml(caseData.device.app_version)} (${escapeHtml(caseData.device.type)})
          </div>
        </div>
        <div class="meta-item full-width">
          <div class="meta-label">Examiner Notes / Remarks</div>
          <div class="meta-value" style="font-weight: normal;">
            ${caseData.remarks ? escapeHtml(caseData.remarks) : '<em>No remarks provided.</em>'}
          </div>
        </div>
      </div>

      <!-- TABLE OF CONTENTS -->
      <h2 class="section-title">Evidence Inventory Summary</h2>
      <table class="toc-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Captured Sections</th>
            <th style="text-align:center;">Items Captured</th>
            <th style="text-align:right;">Navigation</th>
          </tr>
        </thead>
        <tbody>
          ${tocRows || '<tr><td colspan="4">No evidence items recorded in this case.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- SUBSEQUENT PAGES: PLATFORM EVIDENCE SECTIONS -->
    <div class="page evidence-pages">
      ${platformSectionsHtml}
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// buildReportHtml() — FileSystem-based loader
// ---------------------------------------------------------------------------

/**
 * Loads a case from `caseFolder` via `fs` and generates the complete HTML report.
 */
export async function buildReportHtml(
  caseFolderPath: string,
  fs: FileSystem,
  options?: BuildReportOptions,
): Promise<string> {
  const cleanFolderPath = caseFolderPath.replace(/\/+$/, '');
  const caseJsonPath = cleanFolderPath + '/case.json';
  const manifestPath = cleanFolderPath + '/manifest.json';

  if (!(await fs.exists(caseJsonPath))) {
    throw new Error(`case.json not found at '${caseJsonPath}'`);
  }
  if (!(await fs.exists(manifestPath))) {
    throw new Error(`manifest.json not found at '${manifestPath}'`);
  }

  const rawCase = await fs.read(caseJsonPath);
  const caseData: Case = JSON.parse(rawCase);

  const rawManifest = await fs.read(manifestPath);
  const manifestData: { items: EvidenceItem[] } = JSON.parse(rawManifest);
  const items = manifestData.items || [];

  // Optionally load screenshot image data as base64
  const imagesBase64: Record<string, string> = { ...(options?.imagesBase64 || {}) };
  for (const item of items) {
    if (!imagesBase64[item.file_path]) {
      const fullPath = cleanFolderPath + '/' + item.file_path;
      if (await fs.exists(fullPath)) {
        try {
          if (fs.readBinary) {
            const bytes = await fs.readBinary(fullPath);
            imagesBase64[item.file_path] =
              'data:image/png;base64,' + uint8ArrayToBase64(bytes);
          }
        } catch {
          // If reading image binary fails, fallback to SAMPLE_PNG_BASE64
          imagesBase64[item.file_path] = SAMPLE_PNG_BASE64;
        }
      }
    }
  }

  return renderReportHtml(caseData, items, {
    ...options,
    imagesBase64,
  });
}

/**
 * Returns a standalone HTML demo report using built-in demo fixtures.
 */
export function buildDemoReportHtml(options?: BuildReportOptions): string {
  return renderReportHtml(DEMO_CASE, DEMO_ITEMS, options);
}
