import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  validateCaseForm,
  createDesktopCase,
  generateCaseId,
  type CaseFormState,
} from '../src/services/case-service.ts';
import { NodeFileSystem } from '@smp/core';

describe('Case Creation Service & Form (P3-11)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smp-desktop-case-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  test('generateCaseId produces compliant CASE-YYYY-NNNN format', () => {
    const id = generateCaseId(2026, 42);
    assert.equal(id, 'CASE-2026-0042');
  });

  test('validateCaseForm succeeds with valid parameters', () => {
    const form: CaseFormState = {
      caseNumber: 'FIR 102/2026',
      examinerName: 'Inspector R. Sharma',
      examinerDesignation: 'Cyber Forensics Analyst',
      accusedName: 'Suresh Patel',
      agency: 'Cyber Crime Investigation Cell',
      deviceType: 'desktop',
      deviceName: 'Lab Mac Mini M2',
      remarks: 'Digital evidence seizure under Section 65B',
    };

    const res = validateCaseForm(form, {
      caseId: 'CASE-2026-0001',
      createdAt: '2026-11-13T10:00:00.000Z',
    });

    assert.equal(res.valid, true);
    assert.deepEqual(res.errors, {});
    assert.ok(res.input);
    assert.equal(res.input.case_id, 'CASE-2026-0001');
    assert.equal(res.input.case_number, 'FIR 102/2026');
    assert.equal(res.input.examiner_name, 'Inspector R. Sharma');
    assert.equal(res.input.device.type, 'desktop');
  });

  test('validateCaseForm flags missing required fields', () => {
    const emptyForm: CaseFormState = {
      caseNumber: '',
      examinerName: '',
      examinerDesignation: '',
      accusedName: '',
      agency: '',
      deviceType: 'desktop',
      deviceName: '',
      remarks: '',
    };

    const res = validateCaseForm(emptyForm);
    assert.equal(res.valid, false);
    assert.ok(res.errors.case_number);
    assert.ok(res.errors.examiner_name);
    assert.ok(res.errors.agency);
    assert.ok(res.errors['device.name']);
  });

  test('createDesktopCase creates complete case structure on disk with core FileSystem', async () => {
    const form: CaseFormState = {
      caseNumber: 'FIR 999/2026',
      examinerName: 'Insp. A. Verma',
      examinerDesignation: 'Forensic Lead',
      accusedName: 'Unknown',
      agency: 'Central Forensic Science Laboratory',
      deviceType: 'desktop',
      deviceName: 'Forensic Lab Mac #1',
      remarks: 'Seized evidence analysis',
    };

    const validation = validateCaseForm(form, {
      caseId: 'CASE-2026-0999',
      createdAt: '2026-11-13T10:30:00.000Z',
    });
    assert.ok(validation.valid && validation.input);

    const result = await createDesktopCase(tempDir, validation.input, new NodeFileSystem());
    assert.equal(result.caseData.case_id, 'CASE-2026-0999');
    assert.equal(result.caseFolderPath, path.join(tempDir, 'CASE-2026-0999'));

    // Check directory and 4 metadata files exist
    assert.ok(fs.existsSync(result.caseFolderPath));
    assert.ok(fs.existsSync(path.join(result.caseFolderPath, 'case.json')));
    assert.ok(fs.existsSync(path.join(result.caseFolderPath, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(result.caseFolderPath, 'hashes.csv')));
    assert.ok(fs.existsSync(path.join(result.caseFolderPath, 'audit_log.jsonl')));

    // Check case.json contents
    const writtenCase = JSON.parse(
      fs.readFileSync(path.join(result.caseFolderPath, 'case.json'), 'utf8'),
    );
    assert.equal(writtenCase.case_id, 'CASE-2026-0999');
    assert.equal(writtenCase.schema_version, '1.0');
    assert.equal(writtenCase.examiner_name, 'Insp. A. Verma');
  });
});
