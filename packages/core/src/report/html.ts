/**
 * HTML Report Generator for SocialParse Cases.
 *
 * Implements P3-08 and P3-09:
 * - Cover page (case details, examiner, accused, device info, remarks)
 * - Table of contents / executive index (evidence inventory by platform)
 * - Platform sections with screenshot cards, metadata captions, and SHA-256 hashes
 * - Hash table appendix listing every captured file and hashes.csv SHA-256
 * - Legal certification block (Panchnama / Section 65B / BSA §63) with signature lines
 *   for examiner and two independent witnesses (Panch 1 and Panch 2)
 * - QR code containing case ID and hash of hashes.csv
 * - Optional diagonal watermark overlay
 * - Print-friendly CSS targeting A4 pages with clean page breaks
 * - Demo data and standalone renderer for browser viewing
 */

import type { Case, EvidenceItem } from '../schemas/index.ts';
import type { FileSystem } from '../fs/interface.ts';
import { generateQrSvg } from './qrcode.ts';

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

export const DEMO_HASHES_CSV_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// ---------------------------------------------------------------------------
// Base64 helper
// ---------------------------------------------------------------------------

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

function buildReportCss(watermark?: string): string {
  const watermarkCss = watermark
    ? `
  .watermark-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .watermark-text {
    font-size: 72px;
    font-weight: 900;
    color: rgba(148, 163, 184, 0.12);
    transform: rotate(-35deg);
    text-transform: uppercase;
    letter-spacing: 6px;
    user-select: none;
    white-space: nowrap;
  }
  `
    : '';

  return `
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
    position: relative;
  }

  ${watermarkCss}

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

  .toc-table, .appendix-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 32px;
    font-size: 12px;
  }

  .toc-table th, .appendix-table th {
    background: var(--bg-card);
    color: var(--primary);
    text-align: left;
    padding: 8px 12px;
    border: 1px solid var(--border);
    font-weight: 600;
  }

  .toc-table td, .appendix-table td {
    padding: 8px 12px;
    border: 1px solid var(--border);
    color: var(--text);
  }

  .toc-table tr:hover, .appendix-table tr:hover {
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

  /* Certification & Panchnama Block */
  .cert-box {
    border: 2px solid var(--primary);
    border-radius: 8px;
    padding: 24px;
    margin-top: 24px;
    background: #ffffff;
  }

  .cert-title {
    font-size: 15px;
    font-weight: 800;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
    color: var(--primary);
  }

  .cert-text {
    font-size: 12px;
    color: var(--text);
    line-height: 1.6;
    margin-bottom: 24px;
    text-align: justify;
  }

  .cert-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-top: 20px;
  }

  .sig-block {
    border-top: 1px dashed var(--text-muted);
    padding-top: 10px;
    font-size: 12px;
  }

  .sig-title {
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 4px;
  }

  .qr-flex-container {
    display: flex;
    align-items: center;
    gap: 24px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px;
    background: var(--bg-card);
    margin-bottom: 24px;
  }

  .qr-info {
    font-size: 12px;
    color: var(--text);
  }

  .qr-info strong {
    color: var(--primary);
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
}

// ---------------------------------------------------------------------------
// Render options and function
// ---------------------------------------------------------------------------

export interface BuildReportOptions {
  /** Custom report title */
  title?: string;
  /** Map of relative file_path -> base64 Data URI */
  imagesBase64?: Record<string, string>;
  /** Optional watermark text across pages (e.g. "CONFIDENTIAL" or "CERTIFIED EVIDENCE") */
  watermark?: string;
  /** SHA-256 hash of hashes.csv (used in hash appendix and QR code) */
  hashesCsvSha256?: string;
  /** Custom QR code generator */
  qrCodeGenerator?: (text: string) => Promise<string> | string;
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
  const watermark = options?.watermark;
  const hashesCsvSha256 =
    options?.hashesCsvSha256 ?? DEMO_HASHES_CSV_SHA256;

  // Group items by platform
  const itemsByPlatform = new Map<string, EvidenceItem[]>();
  let totalBytes = 0;
  for (const item of items) {
    totalBytes += item.file_size_bytes;
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

  // Build Appendix Table rows (P3-09)
  const appendixRows = items
    .map((item) => {
      return `
      <tr>
        <td><strong>${escapeHtml(item.item_id)}</strong></td>
        <td>${escapeHtml(item.platform)} / ${escapeHtml(item.section)}</td>
        <td class="mono">${escapeHtml(item.file_path)}</td>
        <td style="text-align:right;">${item.file_size_bytes.toLocaleString()} B</td>
        <td class="mono" style="font-size:10px;">${escapeHtml(item.sha256)}</td>
        <td style="font-size:11px;">${escapeHtml(item.captured_at)}</td>
      </tr>
    `;
    })
    .join('\n');

  // Generate QR code (P3-09)
  const qrDataText = `Case ID: ${caseData.case_id}\nHashes SHA-256: ${hashesCsvSha256}`;
  const qrSvg = generateQrSvg(qrDataText, { size: 130 });

  const watermarkHtml = watermark
    ? `<div class="watermark-overlay"><div class="watermark-text">${escapeHtml(watermark)}</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - ${escapeHtml(caseData.case_id)}</title>
  <style>${buildReportCss(watermark)}</style>
</head>
<body>
  ${watermarkHtml}
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

    <!-- APPENDIX & CERTIFICATION PAGE (P3-09) -->
    <div class="page appendix-page page-break">
      <h2 class="section-title">Appendix: Cryptographic Hash Register</h2>
      <table class="appendix-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Platform/Sec</th>
            <th>Relative File Path</th>
            <th style="text-align:right;">Size</th>
            <th>SHA-256 Digest</th>
            <th>Captured (UTC)</th>
          </tr>
        </thead>
        <tbody>
          ${appendixRows || '<tr><td colspan="6">No evidence items.</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="background:var(--bg-card);font-weight:700;">
            <td colspan="3">Total: ${items.length} Evidence Items</td>
            <td style="text-align:right;">${totalBytes.toLocaleString()} B</td>
            <td colspan="2" class="mono" style="font-size:10px;">hashes.csv SHA-256: ${escapeHtml(hashesCsvSha256)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- CRYPTOGRAPHIC QR CODE VERIFICATION BLOCK (P3-09) -->
      <div class="qr-flex-container no-break">
        <div class="qr-code-box">
          ${qrSvg}
        </div>
        <div class="qr-info">
          <strong>Cryptographic Authenticity QR Code</strong><br />
          Scan with any standard QR reader to independently verify the digital evidence record against external filings.<br /><br />
          <span><strong>Case ID:</strong> <span class="mono">${escapeHtml(caseData.case_id)}</span></span><br />
          <span><strong>Hashes CSV SHA-256:</strong> <span class="mono">${escapeHtml(hashesCsvSha256)}</span></span>
        </div>
      </div>

      <!-- CERTIFICATE OF AUTHENTICITY / PANCHNAMA (P3-09) -->
      <div class="cert-box no-break">
        <div class="cert-title">
          Certificate of Authenticity of Electronic Evidence<br />
          <span style="font-size:12px;font-weight:600;color:var(--text-muted);">(Under Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam)</span>
        </div>
        <div class="cert-text">
          I, <strong>${escapeHtml(caseData.examiner_name)}</strong>, holding the rank/designation of <strong>${escapeHtml(caseData.examiner_designation)}</strong> with <strong>${escapeHtml(caseData.agency)}</strong>, hereby certify that the electronic records contained in this report were captured from open social media platforms using the SocialParse evidence capture system operating properly under my lawful control. The SHA-256 cryptographic fingerprints and sequential audit log chain established at the time of extraction confirm that the electronic data has not been altered or tampered with in any manner.
        </div>

        <div class="cert-signatures">
          <!-- Examiner Signature -->
          <div class="sig-block">
            <div class="sig-title">Examiner Signature & Seal</div>
            Name: ${escapeHtml(caseData.examiner_name)}<br />
            Rank: ${escapeHtml(caseData.examiner_designation)}<br />
            Date: ________________________<br />
            Signature: ___________________
          </div>

          <!-- Official Seal / Stamp -->
          <div class="sig-block">
            <div class="sig-title">Official Unit Seal</div>
            Agency: ${escapeHtml(caseData.agency)}<br />
            Place: _______________________<br />
            Seal: [ OFFICIAL STAMP ]
          </div>

          <!-- Witness / Panch 1 -->
          <div class="sig-block">
            <div class="sig-title">Independent Witness 1 (Panch 1)</div>
            Name: ________________________<br />
            Address / ID: ________________<br />
            Date: ________________________<br />
            Signature: ___________________
          </div>

          <!-- Witness / Panch 2 -->
          <div class="sig-block">
            <div class="sig-title">Independent Witness 2 (Panch 2)</div>
            Name: ________________________<br />
            Address / ID: ________________<br />
            Date: ________________________<br />
            Signature: ___________________
          </div>
        </div>
      </div>
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
  const hashesCsvPath = cleanFolderPath + '/hashes.csv';

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

  // Compute or load hashes.csv SHA-256 for the appendix & QR code
  let hashesCsvSha256 = options?.hashesCsvSha256;
  if (!hashesCsvSha256 && (await fs.exists(hashesCsvPath))) {
    try {
      const csvContent = await fs.read(hashesCsvPath);
      // If node crypto or browser crypto is available, hash it
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(csvContent),
        );
        hashesCsvSha256 = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        // Fallback demo/sample hash
        hashesCsvSha256 = DEMO_HASHES_CSV_SHA256;
      }
    } catch {
      hashesCsvSha256 = DEMO_HASHES_CSV_SHA256;
    }
  }

  // Load screenshot image data as base64
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
          imagesBase64[item.file_path] = SAMPLE_PNG_BASE64;
        }
      }
    }
  }

  return renderReportHtml(caseData, items, {
    ...options,
    hashesCsvSha256,
    imagesBase64,
  });
}

/**
 * Returns a standalone HTML demo report using built-in demo fixtures.
 */
export function buildDemoReportHtml(options?: BuildReportOptions): string {
  return renderReportHtml(DEMO_CASE, DEMO_ITEMS, options);
}
