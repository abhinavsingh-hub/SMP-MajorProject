/**
 * Core types for @smp/ai-analyzer.
 *
 * Implements the evidentiary analysis records for social media feeds
 * captured during investigations (e.g., NIA Anti-Cyber Terrorism Panchnamas).
 */

import { z } from 'zod';
import {
  AnalysisFlagSchema,
  AnalysisRecordSchema,
  CaseAnalysisSummarySchema,
  EntityTypeSchema,
  ExtractedEntitySchema,
  PlatformAnalysisSchema,
  QualityAssessmentSchema,
  SectionCategorySchema,
} from './schemas.js';

export const MACHINE_GENERATED_DISCLAIMER =
  'machine-generated, examiner must verify' as const;

export type EntityType = z.infer<typeof EntityTypeSchema>;
export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;
export type SectionCategory = z.infer<typeof SectionCategorySchema>;
export type AnalysisFlag = z.infer<typeof AnalysisFlagSchema>;
export type QualityAssessment = z.infer<typeof QualityAssessmentSchema>;
export type AnalysisRecord = z.infer<typeof AnalysisRecordSchema>;
export type PlatformAnalysis = z.infer<typeof PlatformAnalysisSchema>;
export type CaseAnalysisSummary = z.infer<typeof CaseAnalysisSummarySchema>;

export interface ManifestItemRef {
  itemId: string;
  platform: string;
  section: string;
  filePath: string;
  fileSizeBytes: number;
  sha256: string;
  capturedAt: string;
}

export interface CaseFolderData {
  caseFolder: string;
  caseJson: {
    schema_version: string;
    case_id: string;
    case_number: string;
    examiner_name: string;
    examiner_designation: string;
    accused_name: string;
    agency: string;
    created_at: string;
    device: {
      type: 'desktop' | 'android';
      name: string;
      os: string;
      os_version: string;
      app_version: string;
    };
    remarks: string;
  };
  manifest: {
    schema_version: string;
    case_id: string;
    hash_algorithm: string;
    created_at: string;
    updated_at: string;
    items: Array<{
      item_id: string;
      platform: string;
      section: string;
      file_path: string;
      file_size_bytes: number;
      sha256: string;
      captured_at: string;
    }>;
  };
  hashes: Array<{
    item_id: string;
    platform: string;
    section: string;
    file_path: string;
    sha256: string;
    captured_at: string;
  }>;
  auditEvents: Array<{
    seq: number;
    timestamp: string;
    actor: string;
    event_type: string;
    details: Record<string, unknown>;
    prev_hash: string;
    event_hash: string;
  }>;
}
