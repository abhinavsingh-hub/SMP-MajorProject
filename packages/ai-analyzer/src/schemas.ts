/**
 * Zod validation schemas for @smp/ai-analyzer.
 */

import { z } from 'zod';

export const UtcTimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    'Timestamp must be ISO 8601 UTC ending in Z',
  );

export const Sha256HashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'SHA-256 must be 64 lowercase hexadecimal characters');

export const EntityTypeSchema = z.enum([
  'phone',
  'email',
  'url',
  'handle',
  'date',
  'hashtag',
  'mention',
]);

export const ExtractedEntitySchema = z.object({
  type: EntityTypeSchema,
  value: z.string().min(1),
  raw: z.string().min(1),
  confidence: z.number().min(0).max(1),
  indices: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
});

export const SectionCategorySchema = z.enum([
  'profile',
  'posts',
  'messages',
  'followers',
  'following',
  'account_info',
  'security',
  'other',
]);

export const AnalysisFlagSchema = z.enum([
  'FLAG_SECURE_BLOCKED',
  'BLANK_SCREEN',
  'BLURRY',
  'DUPLICATE',
  'CREDENTIALS_DETECTED',
  'INSUFFICIENT_TEXT',
]);

export const QualityAssessmentSchema = z.object({
  isBlackOrBlank: z.boolean(),
  isBlurry: z.boolean(),
  isDuplicate: z.boolean(),
  blurScore: z.number().nonnegative(),
  brightnessScore: z.number().min(0).max(255),
  perceptualHash: z.string().optional(),
  duplicateOfId: z.string().optional(),
});

export const AnalysisRecordSchema = z.object({
  screenshotId: z.string().min(1),
  platform: z.string().min(1),
  section: z.string().min(1),
  filePath: z.string().min(1),
  sha256: Sha256HashSchema,
  ocrText: z.string(),
  entities: z.array(ExtractedEntitySchema),
  category: SectionCategorySchema,
  confidence: z.number().min(0).max(1),
  flags: z.array(AnalysisFlagSchema),
  quality: QualityAssessmentSchema,
  summary: z.string(),
  analyzedAt: UtcTimestampSchema,
  model: z.string().min(1),
  version: z.string().min(1),
  machineGeneratedDisclaimer: z.literal('machine-generated, examiner must verify'),
});

export const PlatformAnalysisSchema = z.object({
  platform: z.string().min(1),
  analyzedAt: UtcTimestampSchema,
  totalScreenshots: z.number().int().nonnegative(),
  flaggedCount: z.number().int().nonnegative(),
  records: z.array(AnalysisRecordSchema),
});

export const EntityAppearanceSchema = z.object({
  platform: z.string().min(1),
  screenshotId: z.string().min(1),
  section: z.string().min(1),
});

export const EntityIndexEntrySchema = z.object({
  type: EntityTypeSchema,
  value: z.string().min(1),
  appearances: z.array(EntityAppearanceSchema),
});

export const FlaggedItemSummarySchema = z.object({
  screenshotId: z.string().min(1),
  platform: z.string().min(1),
  flags: z.array(AnalysisFlagSchema),
  summary: z.string(),
});

export const CaseAnalysisSummarySchema = z.object({
  caseId: z.string().min(1),
  generatedAt: UtcTimestampSchema,
  totalScreenshots: z.number().int().nonnegative(),
  platforms: z.record(
    z.string(),
    z.object({
      total: z.number().int().nonnegative(),
      flagged: z.number().int().nonnegative(),
      categories: z.record(z.string(), z.number().int().nonnegative()),
    }),
  ),
  entityIndex: z.record(z.string(), EntityIndexEntrySchema),
  flaggedItems: z.array(FlaggedItemSummarySchema),
  disclaimer: z.literal('machine-generated, examiner must verify'),
});
