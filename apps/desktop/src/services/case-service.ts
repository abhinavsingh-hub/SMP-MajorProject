import {
  CaseSchema,
  createCaseFolder,
  NodeFileSystem,
  nodeSha256,
} from '@smp/core';
import type {
  FileSystem,
  Sha256Fn,
  CreateCaseInput,
  CreateCaseResult,
} from '@smp/core';

/**
 * Generate a standard conforming Case ID: CASE-YYYY-NNNN
 */
export function generateCaseId(year = new Date().getUTCFullYear(), seq = 1): string {
  const paddedSeq = String(seq).padStart(4, '0');
  return `CASE-${year}-${paddedSeq}`;
}

export interface CaseFormState {
  caseNumber: string;
  examinerName: string;
  examinerDesignation: string;
  accusedName: string;
  agency: string;
  deviceType: 'desktop' | 'android';
  deviceName: string;
  deviceOs?: string;
  deviceOsVersion?: string;
  appVersion?: string;
  remarks: string;
  caseId?: string;
  createdAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  input?: CreateCaseInput;
}

/**
 * Validates form fields against the @smp/core CaseSchema.
 */
export function validateCaseForm(
  form: CaseFormState,
  options?: { caseId?: string; createdAt?: string },
): ValidationResult {
  const caseId = options?.caseId ?? form.caseId ?? generateCaseId();
  const createdAt = options?.createdAt ?? form.createdAt ?? new Date().toISOString();

  const candidate = {
    schema_version: '1.0',
    case_id: caseId,
    case_number: form.caseNumber.trim(),
    examiner_name: form.examinerName.trim(),
    examiner_designation: form.examinerDesignation.trim(),
    accused_name: form.accusedName.trim(),
    agency: form.agency.trim(),
    created_at: createdAt,
    device: {
      type: form.deviceType,
      name: form.deviceName.trim(),
      os: form.deviceOs?.trim() || (form.deviceType === 'desktop' ? 'macOS' : 'Android'),
      os_version: form.deviceOsVersion?.trim() || '14.0',
      app_version: form.appVersion?.trim() || '0.1.0',
    },
    remarks: form.remarks.trim(),
  };

  const parsed = CaseSchema.safeParse(candidate);

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.') || 'general';
      errors[field] = issue.message;
    }
    return { valid: false, errors };
  }

  const input: CreateCaseInput = {
    case_id: parsed.data.case_id,
    case_number: parsed.data.case_number,
    examiner_name: parsed.data.examiner_name,
    examiner_designation: parsed.data.examiner_designation,
    accused_name: parsed.data.accused_name,
    agency: parsed.data.agency,
    device: parsed.data.device,
    remarks: parsed.data.remarks,
    created_at: parsed.data.created_at,
  };

  return { valid: true, errors: {}, input };
}

/**
 * Creates the case folder on disk using the provided FileSystem and SHA-256 implementation.
 * Defaults to NodeFileSystem and nodeSha256 for the desktop environment.
 */
export async function createDesktopCase(
  basePath: string,
  input: CreateCaseInput,
  fs: FileSystem = new NodeFileSystem(),
  sha256: Sha256Fn = nodeSha256,
): Promise<CreateCaseResult> {
  return createCaseFolder(basePath, input, fs, sha256);
}
