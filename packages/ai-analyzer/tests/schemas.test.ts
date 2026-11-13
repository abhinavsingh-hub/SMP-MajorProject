import { describe, expect, it } from 'vitest';
import {
  AnalysisRecordSchema,
  CaseAnalysisSummarySchema,
  ExtractedEntitySchema,
  MACHINE_GENERATED_DISCLAIMER,
  PlatformAnalysisSchema,
} from '../src/index.js';

describe('schemas and types', () => {
  const validSha = '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb';
  const validTimestamp = '2026-11-12T09:31:58.311Z';

  it('validates a correct AnalysisRecord', () => {
    const record = {
      screenshotId: 'ITEM-0001',
      platform: 'instagram',
      section: 'profile',
      filePath: 'instagram/screenshots/instagram_profile_0001_20261112T093158Z.png',
      sha256: validSha,
      ocrText: 'User @investigative_target Phone: +919876543210 Bio link: https://t.me/intel',
      entities: [
        {
          type: 'handle' as const,
          value: '@investigative_target',
          raw: '@investigative_target',
          confidence: 0.99,
        },
        {
          type: 'phone' as const,
          value: '+919876543210',
          raw: '+919876543210',
          confidence: 0.95,
        },
        {
          type: 'url' as const,
          value: 'https://t.me/intel',
          raw: 'https://t.me/intel',
          confidence: 0.95,
        },
      ],
      category: 'profile' as const,
      confidence: 0.94,
      flags: [],
      quality: {
        isBlackOrBlank: false,
        isBlurry: false,
        isDuplicate: false,
        blurScore: 145.2,
        brightnessScore: 120.5,
      },
      summary: 'Instagram profile for target user showing contact details and telegram handle.',
      analyzedAt: validTimestamp,
      model: 'rule-based@1.0.0',
      version: '1.0.0',
      machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
    };

    const parsed = AnalysisRecordSchema.safeParse(record);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid sha256 in AnalysisRecord', () => {
    const badRecord = {
      screenshotId: 'ITEM-0001',
      platform: 'instagram',
      section: 'profile',
      filePath: 'test.png',
      sha256: 'not-a-sha',
      ocrText: '',
      entities: [],
      category: 'profile' as const,
      confidence: 0.8,
      flags: [],
      quality: {
        isBlackOrBlank: false,
        isBlurry: false,
        isDuplicate: false,
        blurScore: 100,
        brightnessScore: 100,
      },
      summary: 'Summary',
      analyzedAt: validTimestamp,
      model: 'test',
      version: '1.0.0',
      machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
    };

    const parsed = AnalysisRecordSchema.safeParse(badRecord);
    expect(parsed.success).toBe(false);
  });

  it('rejects modified disclaimer in AnalysisRecord', () => {
    const badRecord = {
      screenshotId: 'ITEM-0001',
      platform: 'instagram',
      section: 'profile',
      filePath: 'test.png',
      sha256: validSha,
      ocrText: '',
      entities: [],
      category: 'profile' as const,
      confidence: 0.8,
      flags: [],
      quality: {
        isBlackOrBlank: false,
        isBlurry: false,
        isDuplicate: false,
        blurScore: 100,
        brightnessScore: 100,
      },
      summary: 'Summary',
      analyzedAt: validTimestamp,
      model: 'test',
      version: '1.0.0',
      machineGeneratedDisclaimer: 'human-verified',
    };

    const parsed = AnalysisRecordSchema.safeParse(badRecord);
    expect(parsed.success).toBe(false);
  });

  it('validates PlatformAnalysis and CaseAnalysisSummary', () => {
    const platformAnalysis = {
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
          ocrText: 'sample',
          entities: [],
          category: 'profile' as const,
          confidence: 0.9,
          flags: [],
          quality: {
            isBlackOrBlank: false,
            isBlurry: false,
            isDuplicate: false,
            blurScore: 120,
            brightnessScore: 110,
          },
          summary: 'sample summary',
          analyzedAt: validTimestamp,
          model: 'rule-based@1.0.0',
          version: '1.0.0',
          machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
        },
      ],
    };

    expect(PlatformAnalysisSchema.safeParse(platformAnalysis).success).toBe(true);

    const caseSummary = {
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
        'phone:+919876543210': {
          type: 'phone' as const,
          value: '+919876543210',
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
    };

    expect(CaseAnalysisSummarySchema.safeParse(caseSummary).success).toBe(true);
  });

  it('validates ExtractedEntity bounds and fields', () => {
    const entity = {
      type: 'email' as const,
      value: 'target@suspect.org',
      raw: 'TARGET@SUSPECT.ORG',
      confidence: 0.98,
      indices: [10, 28] as [number, number],
    };

    expect(ExtractedEntitySchema.safeParse(entity).success).toBe(true);
  });
});
