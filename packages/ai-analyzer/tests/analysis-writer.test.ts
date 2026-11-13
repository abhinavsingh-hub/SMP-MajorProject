import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  AnalysisWriter,
  MACHINE_GENERATED_DISCLAIMER,
  type PipelineRunResult,
} from '../src/index.js';

describe('AnalysisWriter', () => {
  let tmpDir: string;
  const writer = new AnalysisWriter();

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'analysis-writer-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes platform analysis.json and case analysis_summary.json with valid schema', async () => {
    const validSha = '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb';
    const validTimestamp = '2026-11-12T09:31:58.311Z';

    const pipelineResult: PipelineRunResult = {
      records: [
        {
          screenshotId: 'ITEM-0001',
          platform: 'instagram',
          section: 'profile',
          filePath: 'instagram/screenshots/test.png',
          sha256: validSha,
          ocrText: 'User @suspect',
          entities: [{ type: 'handle', value: '@suspect', raw: '@suspect', confidence: 0.95 }],
          category: 'profile',
          confidence: 0.92,
          flags: [],
          quality: {
            isBlackOrBlank: false,
            isBlurry: false,
            isDuplicate: false,
            blurScore: 100,
            brightnessScore: 120,
          },
          summary: 'Instagram profile summary',
          analyzedAt: validTimestamp,
          model: 'rule-based@1.0.0',
          version: '1.0.0',
          machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
        },
      ],
      platformAnalyses: {
        instagram: {
          platform: 'instagram',
          analyzedAt: validTimestamp,
          totalScreenshots: 1,
          flaggedCount: 0,
          records: [
            {
              screenshotId: 'ITEM-0001',
              platform: 'instagram',
              section: 'profile',
              filePath: 'instagram/screenshots/test.png',
              sha256: validSha,
              ocrText: 'User @suspect',
              entities: [{ type: 'handle', value: '@suspect', raw: '@suspect', confidence: 0.95 }],
              category: 'profile',
              confidence: 0.92,
              flags: [],
              quality: {
                isBlackOrBlank: false,
                isBlurry: false,
                isDuplicate: false,
                blurScore: 100,
                brightnessScore: 120,
              },
              summary: 'Instagram profile summary',
              analyzedAt: validTimestamp,
              model: 'rule-based@1.0.0',
              version: '1.0.0',
              machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
            },
          ],
        },
      },
      caseSummary: {
        caseId: 'CASE-2026-0042',
        generatedAt: validTimestamp,
        totalScreenshots: 1,
        platforms: {
          instagram: {
            total: 1,
            flagged: 0,
            categories: { profile: 1 },
          },
        },
        entityIndex: {
          'handle:@suspect': {
            type: 'handle',
            value: '@suspect',
            appearances: [
              {
                platform: 'instagram',
                screenshotId: 'ITEM-0001',
                section: 'profile',
              },
            ],
          },
        },
        flaggedItems: [],
        disclaimer: MACHINE_GENERATED_DISCLAIMER,
      },
    };

    const writeResult = await writer.writeAnalysisResults(tmpDir, pipelineResult);

    expect(writeResult.platformFilesWritten).toHaveLength(1);
    expect(writeResult.platformFilesWritten[0]).toContain(path.join('instagram', 'analysis.json'));

    // Check formatting has newline and is formatted
    const rawContent = await fs.readFile(writeResult.caseSummaryFile, 'utf8');
    expect(rawContent.endsWith('\n')).toBe(true);
    expect(rawContent).toContain('  "caseId": "CASE-2026-0042"');

    // Read back and parse
    const readPlatform = await writer.readPlatformAnalysis(tmpDir, 'instagram');
    expect(readPlatform.records[0].screenshotId).toBe('ITEM-0001');

    const readSummary = await writer.readCaseSummary(tmpDir);
    expect(readSummary.caseId).toBe('CASE-2026-0042');
    expect(readSummary.disclaimer).toBe('machine-generated, examiner must verify');
  });
});
