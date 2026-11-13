/**
 * Analysis file persistence service for SocialParse.
 *
 * Writes:
 * 1. <caseFolder>/<platform>/analysis.json  (Per-platform analysis records)
 * 2. <caseFolder>/analysis_summary.json     (Case-level aggregated summary & entity cross-index)
 *
 * Formats: UTF-8, 2-space indentation, trailing newline (DATA_CONTRACT.md §2.5).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  CaseAnalysisSummarySchema,
  PlatformAnalysisSchema,
} from './schemas.js';
import type {
  CaseAnalysisSummary,
  PlatformAnalysis,
} from './types.js';
import type { PipelineRunResult } from './pipeline.js';

export interface AnalysisWriteResult {
  platformFilesWritten: string[];
  caseSummaryFile: string;
}

export class AnalysisWriter {
  /**
   * Writes all platform analysis.json files and the case-level analysis_summary.json.
   */
  public async writeAnalysisResults(
    caseFolder: string,
    pipelineResult: PipelineRunResult,
  ): Promise<AnalysisWriteResult> {
    const platformFilesWritten: string[] = [];

    // 1. Write per-platform analysis.json
    for (const [platform, platformData] of Object.entries(pipelineResult.platformAnalyses)) {
      // Validate schema
      PlatformAnalysisSchema.parse(platformData);

      const platformDir = path.join(caseFolder, platform);
      await fs.mkdir(platformDir, { recursive: true });

      const platformFilePath = path.join(platformDir, 'analysis.json');
      const platformJson = `${JSON.stringify(platformData, null, 2)}\n`;
      await fs.writeFile(platformFilePath, platformJson, 'utf8');
      platformFilesWritten.push(platformFilePath);
    }

    // 2. Write case-level analysis_summary.json
    CaseAnalysisSummarySchema.parse(pipelineResult.caseSummary);

    const caseSummaryPath = path.join(caseFolder, 'analysis_summary.json');
    const caseSummaryJson = `${JSON.stringify(pipelineResult.caseSummary, null, 2)}\n`;
    await fs.writeFile(caseSummaryPath, caseSummaryJson, 'utf8');

    return {
      platformFilesWritten,
      caseSummaryFile: caseSummaryPath,
    };
  }

  /**
   * Reads and parses a platform's analysis.json file.
   */
  public async readPlatformAnalysis(caseFolder: string, platform: string): Promise<PlatformAnalysis> {
    const filePath = path.join(caseFolder, platform, 'analysis.json');
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return PlatformAnalysisSchema.parse(parsed);
  }

  /**
   * Reads and parses the case-level analysis_summary.json file.
   */
  public async readCaseSummary(caseFolder: string): Promise<CaseAnalysisSummary> {
    const filePath = path.join(caseFolder, 'analysis_summary.json');
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return CaseAnalysisSummarySchema.parse(parsed);
  }
}
