/**
 * Multimodal Analysis Pipeline Orchestrator for SocialParse.
 *
 * Coordinates:
 * Case Reader -> Quality Checks -> OCR -> Entity Extraction ->
 * Section Classification -> Summary Generation -> Audit Logging.
 */

import { promises as fs } from 'node:fs';
import { CaseReader } from './case-reader.js';
import { QualityChecker } from './quality-checker.js';
import { OcrService } from './ocr-service.js';
import { EntityExtractor } from './entity-extractor.js';
import { SectionClassifier } from './section-classifier.js';
import { type ISummaryProvider, RuleBasedSummaryProvider } from './summary-provider.js';
import { appendAuditEvent } from './audit-logger.js';
import {
  type AnalysisFlag,
  type AnalysisRecord,
  type CaseAnalysisSummary,
  MACHINE_GENERATED_DISCLAIMER,
  type ManifestItemRef,
  type PlatformAnalysis,
} from './types.js';

export interface PipelineOptions {
  summaryProvider?: ISummaryProvider;
  ocrService?: OcrService;
  entityExtractor?: EntityExtractor;
  sectionClassifier?: SectionClassifier;
  qualityChecker?: QualityChecker;
  appendAuditEvents?: boolean; // default: true
}

export interface PipelineRunResult {
  records: AnalysisRecord[];
  platformAnalyses: Record<string, PlatformAnalysis>;
  caseSummary: CaseAnalysisSummary;
}

export class AnalysisPipeline {
  private summaryProvider: ISummaryProvider;
  private ocrService: OcrService;
  private entityExtractor: EntityExtractor;
  private sectionClassifier: SectionClassifier;
  private qualityChecker: QualityChecker;
  private appendAuditEvents: boolean;

  constructor(options: PipelineOptions = {}) {
    this.summaryProvider = options.summaryProvider ?? new RuleBasedSummaryProvider();
    this.ocrService = options.ocrService ?? new OcrService();
    this.entityExtractor = options.entityExtractor ?? new EntityExtractor();
    this.sectionClassifier = options.sectionClassifier ?? new SectionClassifier();
    this.qualityChecker = options.qualityChecker ?? new QualityChecker();
    this.appendAuditEvents = options.appendAuditEvents ?? true;
  }

  /**
   * Executes analysis across all screenshots in a case folder.
   */
  public async analyzeCase(caseFolder: string): Promise<PipelineRunResult> {
    const reader = new CaseReader(caseFolder);
    const caseData = await reader.readCase();
    const manifestItems = CaseReader.extractManifestItems(caseData.manifest);

    this.qualityChecker.resetRegistry();

    if (this.appendAuditEvents) {
      await appendAuditEvent(caseFolder, {
        actor: 'desktop_app',
        event_type: 'capture_resumed', // using compliant DATA_CONTRACT event
        details: {
          action: 'ai_analysis_started',
          case_id: caseData.caseJson.case_id,
          total_items: manifestItems.length,
          model: this.summaryProvider.name,
        },
      });
    }

    const records: AnalysisRecord[] = [];

    for (const item of manifestItems) {
      const record = await this.analyzeItem(item, caseFolder, caseData.caseJson);
      records.push(record);

      if (this.appendAuditEvents) {
        await appendAuditEvent(caseFolder, {
          actor: 'desktop_app',
          event_type: 'item_captured', // record analysis step
          details: {
            action: 'ai_item_analyzed',
            item_id: item.itemId,
            platform: item.platform,
            section: item.section,
            flags: record.flags,
            entities_count: record.entities.length,
            category: record.category,
          },
        });
      }
    }

    // Platform-wise aggregation
    const platformAnalyses: Record<string, PlatformAnalysis> = {};
    for (const record of records) {
      if (!platformAnalyses[record.platform]) {
        platformAnalyses[record.platform] = {
          platform: record.platform,
          analyzedAt: new Date().toISOString(),
          totalScreenshots: 0,
          flaggedCount: 0,
          records: [],
        };
      }
      const pAnalysis = platformAnalyses[record.platform];
      pAnalysis.totalScreenshots++;
      if (record.flags.length > 0) {
        pAnalysis.flaggedCount++;
      }
      pAnalysis.records.push(record);
    }

    // Build Case-level Analysis Summary & Cross-Platform Entity Index
    const caseSummary = this.buildCaseSummary(caseData.caseJson.case_id, records, platformAnalyses);

    if (this.appendAuditEvents) {
      await appendAuditEvent(caseFolder, {
        actor: 'desktop_app',
        event_type: 'capture_finished',
        details: {
          action: 'ai_analysis_completed',
          case_id: caseData.caseJson.case_id,
          total_analyzed: records.length,
          total_flagged: caseSummary.flaggedItems.length,
          platforms: Object.keys(platformAnalyses),
        },
      });
    }

    return {
      records,
      platformAnalyses,
      caseSummary,
    };
  }

  /**
   * Analyzes an individual evidence item.
   */
  public async analyzeItem(
    item: ManifestItemRef,
    caseFolder: string,
    caseJson?: { case_number?: string; accused_name?: string },
  ): Promise<AnalysisRecord> {
    const reader = new CaseReader(caseFolder);
    const absolutePath = reader.resolveItemPath(item.filePath);

    let imageBuffer: Buffer;
    try {
      imageBuffer = await fs.readFile(absolutePath);
    } catch {
      // If image file missing, flag accordingly
      imageBuffer = Buffer.alloc(0);
    }

    // 1. Screenshot quality checks (black screen/FLAG_SECURE, blank, blur, duplicate)
    const qualityResult = this.qualityChecker.assess(imageBuffer, item.itemId);

    // 2. Optical Character Recognition (OCR)
    let ocrText = '';
    let ocrConfidence = 0.0;
    if (imageBuffer.length > 0 && !qualityResult.flags.includes('FLAG_SECURE_BLOCKED') && !qualityResult.flags.includes('BLANK_SCREEN')) {
      try {
        const ocrResult = await this.ocrService.recognize(absolutePath);
        ocrText = ocrResult.text;
        ocrConfidence = ocrResult.confidence;
      } catch {
        ocrText = '';
        ocrConfidence = 0.0;
      }
    }

    // 3. Entity Extraction
    const entities = this.entityExtractor.extract(ocrText);

    // 4. Section Classification
    const classification = this.sectionClassifier.classify(ocrText, item.platform, item.section);

    // 5. Flags compilation
    const flags: AnalysisFlag[] = [...qualityResult.flags];
    if (ocrText.length < 5 && !flags.includes('FLAG_SECURE_BLOCKED') && !flags.includes('BLANK_SCREEN')) {
      flags.push('INSUFFICIENT_TEXT');
    }

    // 6. Investigative Summary Generation
    const summaryResult = await this.summaryProvider.summarize({
      screenshotId: item.itemId,
      platform: item.platform,
      section: item.section,
      category: classification.category,
      ocrText,
      entities,
      flags,
      caseNumber: caseJson?.case_number,
      accusedName: caseJson?.accused_name,
    });

    if (summaryResult.sanitized) {
      flags.push('CREDENTIALS_DETECTED');
    }

    // 7. Assemble final AnalysisRecord
    // Note: sha256 is strictly preserved from manifest item, NEVER recomputed differently.
    const record: AnalysisRecord = {
      screenshotId: item.itemId,
      platform: item.platform,
      section: item.section,
      filePath: item.filePath,
      sha256: item.sha256,
      ocrText,
      entities,
      category: classification.category,
      confidence: Number(((ocrConfidence + classification.confidence + summaryResult.confidence) / 3).toFixed(2)),
      flags,
      quality: qualityResult.assessment,
      summary: summaryResult.summary,
      analyzedAt: new Date().toISOString(),
      model: summaryResult.model,
      version: '1.0.0',
      machineGeneratedDisclaimer: MACHINE_GENERATED_DISCLAIMER,
    };

    return record;
  }

  /**
   * Builds the case-level analysis summary with cross-platform entity correlation.
   */
  private buildCaseSummary(
    caseId: string,
    records: AnalysisRecord[],
    platformAnalyses: Record<string, PlatformAnalysis>,
  ): CaseAnalysisSummary {
    const platformsSummary: CaseAnalysisSummary['platforms'] = {};
    for (const [platform, analysis] of Object.entries(platformAnalyses)) {
      const categoryCounts: Record<string, number> = {};
      for (const rec of analysis.records) {
        categoryCounts[rec.category] = (categoryCounts[rec.category] ?? 0) + 1;
      }
      platformsSummary[platform] = {
        total: analysis.totalScreenshots,
        flagged: analysis.flaggedCount,
        categories: categoryCounts,
      };
    }

    // Correlate entities across all platforms
    const entityIndex: CaseAnalysisSummary['entityIndex'] = {};
    for (const record of records) {
      for (const entity of record.entities) {
        const key = `${entity.type}:${entity.value}`;
        if (!entityIndex[key]) {
          entityIndex[key] = {
            type: entity.type,
            value: entity.value,
            appearances: [],
          };
        }
        entityIndex[key].appearances.push({
          platform: record.platform,
          screenshotId: record.screenshotId,
          section: record.section,
        });
      }
    }

    // Collect all flagged items
    const flaggedItems: CaseAnalysisSummary['flaggedItems'] = records
      .filter((r) => r.flags.length > 0)
      .map((r) => ({
        screenshotId: r.screenshotId,
        platform: r.platform,
        flags: r.flags,
        summary: r.summary,
      }));

    return {
      caseId,
      generatedAt: new Date().toISOString(),
      totalScreenshots: records.length,
      platforms: platformsSummary,
      entityIndex,
      flaggedItems,
      disclaimer: MACHINE_GENERATED_DISCLAIMER,
    };
  }
}
