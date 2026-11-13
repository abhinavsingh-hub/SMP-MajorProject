import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import {
  appendAudit,
  createCaseFolder,
  recordScreenshot,
  verifyCase,
  type CaseVerificationResult,
  type CreateCaseResult,
  type EvidenceItem,
  type FileSystem,
  type Sha256Fn,
} from '@smp/core';
import { RnFileSystem } from './RnFileSystem';
import { rnSha256 } from './sha256';

export interface CreateCaseParams {
  caseNumber: string;
  examinerName: string;
  accusedName: string;
  platform: string;
  agency?: string;
  examinerDesignation?: string;
  remarks?: string;
}

export class EvidenceService {
  private fs: FileSystem;
  private sha256: Sha256Fn;
  private caseFolderPath = '';
  private platform = '';

  constructor(
    caseFolderPath = '',
    platform = '',
    fs: FileSystem = new RnFileSystem(),
    sha256: Sha256Fn = rnSha256,
  ) {
    this.caseFolderPath = caseFolderPath;
    this.platform = platform;
    this.fs = fs;
    this.sha256 = sha256;
  }

  public getCaseFolderPath(): string {
    return this.caseFolderPath;
  }

  public setCaseFolderPath(path: string): void {
    this.caseFolderPath = path;
  }

  public setPlatform(platform: string): void {
    this.platform = platform;
  }

  /**
   * Initializes a case folder in the application document directory using core createCaseFolder().
   */
  public async createCase(params: CreateCaseParams): Promise<CreateCaseResult> {
    const basePath = `${RNFS.DocumentDirectoryPath}/cases`;
    await this.fs.write(`${basePath}/.keep`, '', { recursive: true });

    const normalizedCaseId = this.formatCaseId(params.caseNumber);
    const caseFolder = `${basePath}/${normalizedCaseId}`;

    // If folder already exists from prior session, resume without throwing
    if (await this.fs.exists(`${caseFolder}/case.json`)) {
      this.caseFolderPath = caseFolder;
      this.platform = params.platform;
      const caseJsonRaw = await this.fs.read(`${caseFolder}/case.json`);
      return {
        caseData: JSON.parse(caseJsonRaw),
        caseFolderPath: caseFolder,
      };
    }

    const result = await createCaseFolder(
      basePath,
      {
        case_id: normalizedCaseId,
        case_number: params.caseNumber,
        examiner_name: params.examinerName,
        examiner_designation: params.examinerDesignation ?? 'Forensic Examiner',
        accused_name: params.accusedName,
        agency: params.agency ?? 'NIA ACTD',
        remarks: params.remarks ?? 'Mobile forensic collection',
        device: {
          type: 'android',
          name: 'Android Emulator / Handset',
          os: 'Android',
          os_version: String(Platform.Version),
          app_version: '0.1.0',
        },
      },
      this.fs,
      this.sha256,
    );

    this.caseFolderPath = result.caseFolderPath;
    this.platform = params.platform;
    return result;
  }

  /**
   * Records an evidentiary screenshot into manifest.json and hashes.csv,
   * then appends an item_captured entry to audit_log.jsonl.
   */
  public async onCapture(
    savedFilePath: string,
    section: string,
    source?: string,
    capturedAt?: string,
  ): Promise<EvidenceItem> {
    if (!this.caseFolderPath) {
      throw new Error('Case folder path is not set in EvidenceService');
    }

    const fileName = savedFilePath.split('/').pop() || `${this.platform}_${Date.now()}.png`;
    const relFilePath = `${this.platform}/screenshots/${fileName}`;
    const filePrefix = `${this.platform}_${section}_`;
    const itemNumber = fileName.startsWith(filePrefix)
      ? fileName.slice(filePrefix.length).split('_')[0]
      : '';

    // 1. Record screenshot into manifest and hashes.csv
    const item = await recordScreenshot(
      this.caseFolderPath,
      {
        platform: this.platform,
        section,
        filePath: relFilePath,
        ...(capturedAt ? { capturedAt } : {}),
        ...(/^\d{4,}$/.test(itemNumber) ? { itemId: `ITEM-${itemNumber}` } : {}),
      },
      this.fs,
      this.sha256,
    );

    // 2. Append item_captured event into audit_log.jsonl
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'item_captured',
        details: {
          item_id: item.item_id,
          platform: this.platform,
          section,
          file_path: item.file_path,
          sha256: item.sha256,
          source: source ?? 'screen_capture_module',
        },
      },
      this.fs,
      this.sha256,
    );

    return item;
  }

  public async recordCaptureStart(platform: string): Promise<void> {
    if (!this.caseFolderPath) return;
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'capture_started',
        details: { platform },
      },
      this.fs,
      this.sha256,
    );
  }

  public async recordStepFailed(stepName: string, error: string): Promise<void> {
    if (!this.caseFolderPath) return;
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'capture_error',
        details: { step: stepName, error },
      },
      this.fs,
      this.sha256,
    );
  }

  public async recordCaptureBlocked(section: string, filePath: string): Promise<void> {
    if (!this.caseFolderPath) return;
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'capture_warning',
        details: {
          severity: 'WARNING',
          warning: `screen may be protected by FLAG_SECURE: ${section}`,
          filePath,
          section,
        },
      },
      this.fs,
      this.sha256,
    );
  }

  public async recordPaused(): Promise<void> {
    if (!this.caseFolderPath) return;
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'user_action_required',
        details: { status: 'paused', reason: 'examiner_interrupted' },
      },
      this.fs,
      this.sha256,
    );
  }

  public async recordStopped(): Promise<void> {
    if (!this.caseFolderPath) return;
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'capture_error',
        details: { status: 'stopped', reason: 'examiner_cancelled' },
      },
      this.fs,
      this.sha256,
    );
  }

  public async recordDone(): Promise<void> {
    if (!this.caseFolderPath) return;
    await appendAudit(
      this.caseFolderPath,
      {
        actor: 'android_app',
        event_type: 'capture_finished',
        details: { platform: this.platform, status: 'completed' },
      },
      this.fs,
      this.sha256,
    );
  }

  public async verifyCaseIntegrity(): Promise<CaseVerificationResult> {
    if (!this.caseFolderPath) {
      throw new Error('Case folder path is not set in EvidenceService');
    }
    return verifyCase(this.caseFolderPath, this.fs, this.sha256, {
      recordAuditEvent: true,
    });
  }

  private formatCaseId(rawCaseNumber: string): string {
    const validMatch = rawCaseNumber.match(/^CASE-(\d{4})-(\d{4})$/);
    if (validMatch) return rawCaseNumber;

    const year = new Date().getUTCFullYear();
    const digitsOnly = rawCaseNumber.replace(/\D/g, '');
    const padded = (digitsOnly.length > 0 ? digitsOnly : '1').padStart(4, '0').slice(-4);
    return `CASE-${year}-${padded}`;
  }
}
