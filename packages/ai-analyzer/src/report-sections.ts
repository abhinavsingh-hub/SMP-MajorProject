/**
 * HTML Report Sections Generator for SocialParse.
 *
 * Produces structured, printable Panchnama annexures:
 * 1. Platform findings table (Item ID, Category, SHA-256, Entities, Summary, Flags)
 * 2. Cross-platform Entity Correlation Index
 * 3. Flagged Items Alert List (FLAG_SECURE, blanks, duplicates)
 * 4. Composite helper pluggable into core's buildReportHtml
 *
 * Enforces:
 * - Mandatory "machine-generated, examiner must verify" disclaimer badge
 * - XSS-safe HTML escaping
 * - Print-optimized CSS (@media print) with signature blocks
 */

import { MACHINE_GENERATED_DISCLAIMER } from './types.js';
import type { CaseAnalysisSummary, CaseFolderData, PlatformAnalysis } from './types.js';
import type { PipelineRunResult } from './pipeline.js';

/**
 * Escapes characters for safe HTML inclusion.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds the per-platform findings table HTML snippet.
 */
export function buildPlatformFindingsTableHtml(platformAnalysis: PlatformAnalysis): string {
  const rows = platformAnalysis.records
    .map((record) => {
      const flagBadges = record.flags
        .map(
          (flag) =>
            `<span class="badge ${flag === 'FLAG_SECURE_BLOCKED' ? 'badge-danger' : 'badge-warning'}">${escapeHtml(flag)}</span>`,
        )
        .join(' ');

      const entitiesList = record.entities.length > 0
        ? record.entities
            .slice(0, 4)
            .map((e) => `<span class="entity-tag ${e.type}">${escapeHtml(e.value)}</span>`)
            .join(' ')
        : '<span class="text-muted">None</span>';

      return `
      <tr>
        <td class="font-mono">${escapeHtml(record.screenshotId)}</td>
        <td><span class="category-pill">${escapeHtml(record.category)}</span><br><small class="text-muted">${escapeHtml(record.section)}</small></td>
        <td class="font-mono hash-cell" title="${escapeHtml(record.sha256)}">${escapeHtml(record.sha256.substring(0, 16))}...</td>
        <td>${entitiesList}</td>
        <td>${escapeHtml(record.summary)}</td>
        <td>${flagBadges || '<span class="badge badge-success">OK</span>'}</td>
      </tr>`;
    })
    .join('');

  return `
  <div class="report-section platform-section" id="platform-${escapeHtml(platformAnalysis.platform)}">
    <div class="section-header">
      <h3>Platform: ${escapeHtml(platformAnalysis.platform.toUpperCase())}</h3>
      <span class="meta">Total Captures: ${platformAnalysis.totalScreenshots} | Flagged: ${platformAnalysis.flaggedCount}</span>
    </div>
    <div class="ai-disclaimer-badge">⚠️ AI Finding: ${MACHINE_GENERATED_DISCLAIMER}</div>
    <table class="findings-table">
      <thead>
        <tr>
          <th>Item ID</th>
          <th>Category / Section</th>
          <th>SHA-256 (Manifest)</th>
          <th>Extracted Entities</th>
          <th>Investigative Summary</th>
          <th>Status / Flags</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>`;
}

/**
 * Builds the cross-platform Entity Correlation Index HTML snippet.
 */
export function buildEntityIndexHtml(caseSummary: CaseAnalysisSummary): string {
  const entries = Object.values(caseSummary.entityIndex);

  if (entries.length === 0) {
    return `
    <div class="report-section entity-index-section">
      <h3>Cross-Platform Entity Index</h3>
      <div class="ai-disclaimer-badge">⚠️ AI Finding: ${MACHINE_GENERATED_DISCLAIMER}</div>
      <p class="text-muted">No investigative entities identified across captured feeds.</p>
    </div>`;
  }

  // Sort entities by type, then frequency of appearance
  entries.sort((a, b) => b.appearances.length - a.appearances.length || a.type.localeCompare(b.type));

  const rows = entries
    .map((entry) => {
      const appearanceBadges = entry.appearances
        .map(
          (app) =>
            `<span class="platform-badge ${escapeHtml(app.platform)}">${escapeHtml(app.platform)}: ${escapeHtml(app.screenshotId)}</span>`,
        )
        .join(' ');

      return `
      <tr>
        <td><span class="entity-type-label ${entry.type}">${escapeHtml(entry.type.toUpperCase())}</span></td>
        <td class="font-mono font-bold">${escapeHtml(entry.value)}</td>
        <td>${appearanceBadges}</td>
        <td>${entry.appearances.length}</td>
      </tr>`;
    })
    .join('');

  return `
  <div class="report-section entity-index-section" id="entity-index">
    <div class="section-header">
      <h3>Cross-Platform Entity Correlation Index</h3>
      <span class="meta">Correlating usernames, phone numbers, emails, and links across feeds</span>
    </div>
    <div class="ai-disclaimer-badge">⚠️ AI Finding: ${MACHINE_GENERATED_DISCLAIMER}</div>
    <table class="findings-table entity-table">
      <thead>
        <tr>
          <th>Entity Type</th>
          <th>Normalized Value</th>
          <th>Feed Appearances (Platform: Item ID)</th>
          <th>Matches</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>`;
}

/**
 * Builds the Flagged Items Alert List HTML snippet.
 */
export function buildFlaggedItemsHtml(caseSummary: CaseAnalysisSummary): string {
  if (caseSummary.flaggedItems.length === 0) {
    return `
    <div class="report-section flagged-items-section">
      <h3>Examiner Verification Alerts (Flagged Items)</h3>
      <div class="ai-disclaimer-badge">⚠️ AI Finding: ${MACHINE_GENERATED_DISCLAIMER}</div>
      <p class="text-success">No evidence items flagged for capture anomalies or security blocks.</p>
    </div>`;
  }

  const items = caseSummary.flaggedItems
    .map((item) => {
      const badges = item.flags
        .map((f) => `<span class="badge badge-danger">${escapeHtml(f)}</span>`)
        .join(' ');

      return `
      <div class="flagged-card">
        <div class="flagged-card-header">
          <span class="font-mono font-bold">${escapeHtml(item.screenshotId)}</span>
          <span class="platform-name">[${escapeHtml(item.platform.toUpperCase())}]</span>
          <div class="flags-wrap">${badges}</div>
        </div>
        <p class="flagged-summary">${escapeHtml(item.summary)}</p>
      </div>`;
    })
    .join('');

  return `
  <div class="report-section flagged-items-section" id="flagged-items">
    <div class="section-header">
      <h3 class="text-danger">Examiner Verification Alerts (${caseSummary.flaggedItems.length} Flagged)</h3>
      <span class="meta">Evidence items requiring manual forensic review (FLAG_SECURE, blanks, duplicates)</span>
    </div>
    <div class="ai-disclaimer-badge">⚠️ AI Finding: ${MACHINE_GENERATED_DISCLAIMER}</div>
    <div class="flagged-grid">
      ${items}
    </div>
  </div>`;
}

/**
 * Composite function exporting all AI report sections.
 * Designed to seamlessly plug into core's buildReportHtml or stand alone.
 */
export function buildAiReportSectionsHtml(
  platformAnalyses: Record<string, PlatformAnalysis>,
  caseSummary: CaseAnalysisSummary,
): string {
  const platformTables = Object.values(platformAnalyses)
    .map((pa) => buildPlatformFindingsTableHtml(pa))
    .join('\n');

  const entityIndex = buildEntityIndexHtml(caseSummary);
  const flaggedItems = buildFlaggedItemsHtml(caseSummary);

  return `
  <!-- BEGIN SOCIALPARSE AI ANALYSIS REPORT SECTIONS -->
  <div class="socialparse-ai-analysis-container">
    ${flaggedItems}
    ${entityIndex}
    ${platformTables}
  </div>
  <!-- END SOCIALPARSE AI ANALYSIS REPORT SECTIONS -->`;
}

/**
 * Self-contained full Panchnama report HTML document.
 */
export function buildFullPanchnamaAiReportHtml(
  caseJson: CaseFolderData['caseJson'],
  pipelineResult: PipelineRunResult,
): string {
  const aiSections = buildAiReportSectionsHtml(pipelineResult.platformAnalyses, pipelineResult.caseSummary);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Panchnama Digital Evidence Report - ${escapeHtml(caseJson.case_id)}</title>
  <style>
    :root {
      --primary: #0b2545;
      --secondary: #134074;
      --accent: #8da9c4;
      --danger: #b00020;
      --warning: #b7791f;
      --success: #2e7d32;
      --border: #d0d7de;
      --bg-light: #f6f8fa;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #24292f;
      background: #ffffff;
      line-height: 1.5;
    }
    .header-banner {
      border-bottom: 2px solid var(--primary);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .official-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      margin: 0 0 6px 0;
    }
    .sub-title {
      font-size: 14px;
      color: #57606a;
      margin: 0;
    }
    .case-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      background: var(--bg-light);
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .meta-item label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #57606a;
      display: block;
    }
    .meta-item value {
      font-size: 14px;
      font-weight: 600;
      color: #24292f;
    }
    .ai-disclaimer-badge {
      background: #fff8c5;
      color: #735c0f;
      border: 1px solid #d4a72c;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      display: inline-block;
    }
    .report-section {
      margin-bottom: 32px;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      background: #fff;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .section-header h3 {
      margin: 0;
      font-size: 16px;
      color: var(--primary);
    }
    .section-header .meta {
      font-size: 12px;
      color: #57606a;
    }
    .findings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .findings-table th, .findings-table td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    .findings-table th {
      background: var(--bg-light);
      font-weight: 600;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-danger { background: #ffebe9; color: var(--danger); border: 1px solid #ff8182; }
    .badge-warning { background: #fff8c5; color: var(--warning); border: 1px solid #d4a72c; }
    .badge-success { background: #dafbe1; color: var(--success); border: 1px solid #4ac26b; }
    .category-pill {
      background: #e1f0ff;
      color: #0969da;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .entity-tag {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin: 1px;
      background: #f6f8fa;
      border: 1px solid var(--border);
    }
    .entity-tag.handle { color: #0969da; }
    .entity-tag.phone { color: #1a7f37; }
    .entity-tag.email { color: #8250df; }
    .entity-tag.url { color: #bf8700; }
    .flagged-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .flagged-card {
      border: 1px solid #ff8182;
      background: #ffebe9;
      border-radius: 6px;
      padding: 12px;
    }
    .flagged-card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .signatures-block {
      margin-top: 48px;
      border-top: 2px dashed var(--border);
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
    }
    .sig-box {
      width: 200px;
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #24292f;
      height: 40px;
      margin-bottom: 6px;
    }
    @media print {
      body { padding: 0; }
      .report-section { break-inside: avoid; border: 1px solid #000; }
      .signatures-block { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="official-title">National Investigation Agency (NIA)</div>
    <div class="sub-title">Anti-Cyber Terrorism Division | Panchnama Digital Evidence Feed Analysis</div>
  </div>

  <div class="case-meta-grid">
    <div class="meta-item"><label>Case ID</label><value>${escapeHtml(caseJson.case_id)}</value></div>
    <div class="meta-item"><label>FIR / Case Number</label><value>${escapeHtml(caseJson.case_number)}</value></div>
    <div class="meta-item"><label>Accused / Suspect</label><value>${escapeHtml(caseJson.accused_name)}</value></div>
    <div class="meta-item"><label>Investigating Examiner</label><value>${escapeHtml(caseJson.examiner_name)} (${escapeHtml(caseJson.examiner_designation)})</value></div>
    <div class="meta-item"><label>Agency</label><value>${escapeHtml(caseJson.agency)}</value></div>
    <div class="meta-item"><label>Captured Device</label><value>${escapeHtml(caseJson.device.name)} (${escapeHtml(caseJson.device.type)})</value></div>
  </div>

  ${aiSections}

  <div class="signatures-block">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Panch Witness 1</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Panch Witness 2</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Investigating Officer / Examiner</div>
    </div>
  </div>
</body>
</html>`;
}
