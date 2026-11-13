import { describe, expect, it } from 'vitest';
import {
  buildAiReportSectionsHtml,
  buildEntityIndexHtml,
  buildFlaggedItemsHtml,
  buildFullPanchnamaAiReportHtml,
  buildPlatformFindingsTableHtml,
  escapeHtml,
  MACHINE_GENERATED_DISCLAIMER,
  type CaseAnalysisSummary,
  type CaseFolderData,
  type PipelineRunResult,
  type PlatformAnalysis,
} from '../src/index.js';

describe('HTML Report Sections Generator', () => {
  const validSha = '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb';
  const validTimestamp = '2026-11-12T09:31:58.311Z';

  const mockPlatformAnalysis: PlatformAnalysis = {
    platform: 'instagram',
    analyzedAt: validTimestamp,
    totalScreenshots: 1,
    flaggedCount: 1,
    records: [
      {
        screenshotId: 'ITEM-0001',
        platform: 'instagram',
        section: 'profile',
        filePath: 'instagram/screenshots/test.png',
        sha256: validSha,
        ocrText: 'Bio: @suspect_target Phone: +919876543210',
        entities: [
          { type: 'handle', value: '@suspect_target', raw: '@suspect_target', confidence: 0.95 },
          { type: 'phone', value: '+919876543210', raw: '+919876543210', confidence: 0.9 },
        ],
        category: 'profile',
        confidence: 0.92,
        flags: ['FLAG_SECURE_BLOCKED'],
        quality: {
          isBlackOrBlank: true,
          isBlurry: false,
          isDuplicate: false,
          blurScore: 0,
          brightnessScore: 2,
        },
        summary: 'Target profile blocked by FLAG_SECURE.',
        analyzedAt: validTimestamp,
        model: 'rule-based@1.0.0',
        version: '1.0.0',
        machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
      },
    ],
  };

  const mockCaseSummary: CaseAnalysisSummary = {
    caseId: 'CASE-2026-0042',
    generatedAt: validTimestamp,
    totalScreenshots: 1,
    platforms: {
      instagram: { total: 1, flagged: 1, categories: { profile: 1 } },
    },
    entityIndex: {
      'handle:@suspect_target': {
        type: 'handle',
        value: '@suspect_target',
        appearances: [{ platform: 'instagram', screenshotId: 'ITEM-0001', section: 'profile' }],
      },
    },
    flaggedItems: [
      {
        screenshotId: 'ITEM-0001',
        platform: 'instagram',
        flags: ['FLAG_SECURE_BLOCKED'],
        summary: 'Target profile blocked by FLAG_SECURE.',
      },
    ],
    disclaimer: MACHINE_GENERATED_DISCLAIMER,
  };

  it('escapes dangerous HTML characters to prevent XSS', () => {
    const raw = '<script>alert("xss") & test</script>';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;) &amp; test&lt;/script&gt;');
  });

  it('renders platform findings table with disclaimer badge and flag badges', () => {
    const html = buildPlatformFindingsTableHtml(mockPlatformAnalysis);

    expect(html).toContain('Platform: INSTAGRAM');
    expect(html).toContain(MACHINE_GENERATED_DISCLAIMER);
    expect(html).toContain('ITEM-0001');
    expect(html).toContain('badge-danger');
    expect(html).toContain('FLAG_SECURE_BLOCKED');
    expect(html).toContain('@suspect_target');
  });

  it('renders cross-platform entity correlation index', () => {
    const html = buildEntityIndexHtml(mockCaseSummary);

    expect(html).toContain('Cross-Platform Entity Correlation Index');
    expect(html).toContain(MACHINE_GENERATED_DISCLAIMER);
    expect(html).toContain('@suspect_target');
    expect(html).toContain('instagram: ITEM-0001');
  });

  it('renders flagged items list with alert styling', () => {
    const html = buildFlaggedItemsHtml(mockCaseSummary);

    expect(html).toContain('Examiner Verification Alerts (1 Flagged)');
    expect(html).toContain('FLAG_SECURE_BLOCKED');
    expect(html).toContain('Target profile blocked by FLAG_SECURE.');
  });

  it('builds composite AI report sections', () => {
    const html = buildAiReportSectionsHtml({ instagram: mockPlatformAnalysis }, mockCaseSummary);

    expect(html).toContain('socialparse-ai-analysis-container');
    expect(html).toContain('Cross-Platform Entity Correlation Index');
    expect(html).toContain('Platform: INSTAGRAM');
  });

  it('generates self-contained full Panchnama report document', () => {
    const caseJson: CaseFolderData['caseJson'] = {
      schema_version: '1.0',
      case_id: 'CASE-2026-0042',
      case_number: 'CCU/FIR/118/2026',
      examiner_name: 'Priya Deshmukh',
      examiner_designation: 'Sub-Inspector',
      accused_name: 'Sample Accused',
      agency: 'Example Cyber Crime Unit',
      created_at: validTimestamp,
      device: {
        type: 'desktop',
        name: 'EXAMINER-MAC-01',
        os: 'macOS',
        os_version: '14.5',
        app_version: '0.1.0',
      },
      remarks: 'Notes',
    };

    const pipelineResult: PipelineRunResult = {
      records: mockPlatformAnalysis.records,
      platformAnalyses: { instagram: mockPlatformAnalysis },
      caseSummary: mockCaseSummary,
    };

    const fullHtml = buildFullPanchnamaAiReportHtml(caseJson, pipelineResult);

    expect(fullHtml).toContain('<!DOCTYPE html>');
    expect(fullHtml).toContain('National Investigation Agency (NIA)');
    expect(fullHtml).toContain('Anti-Cyber Terrorism Division');
    expect(fullHtml).toContain('CCU/FIR/118/2026');
    expect(fullHtml).toContain('Priya Deshmukh (Sub-Inspector)');
    expect(fullHtml).toContain('Panch Witness 1');
    expect(fullHtml).toContain('Panch Witness 2');
    expect(fullHtml).toContain('@media print');
  });
});
