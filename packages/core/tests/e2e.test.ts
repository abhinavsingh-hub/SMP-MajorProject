import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  createCaseFolder,
  recordScreenshot,
  verifyCase,
  buildReportHtml,
  appendAudit,
  NodeFileSystem,
  nodeSha256,
  type CreateCaseInput,
} from '../src/index.ts';

describe('End-to-End Forensic Workflow & Cross-Platform Integrity (P3-13)', () => {
  let tempDir: string;
  let nfs: NodeFileSystem;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smp-e2e-test-'));
    nfs = new NodeFileSystem();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  test('complete happy path: create case -> record evidence -> verify -> HTML report -> Android export/import -> re-verify', async () => {
    // -------------------------------------------------------------------------
    // 1. Create Forensic Case Folder
    // -------------------------------------------------------------------------
    const caseInput: CreateCaseInput = {
      case_id: 'CASE-2026-8888',
      case_number: 'CR-542/2026',
      examiner_name: 'Deputy SP R. K. Nair',
      examiner_designation: 'Senior Digital Forensics Examiner',
      accused_name: 'Vikramaditya Roy',
      agency: 'State Cyber Crime Investigation Bureau',
      created_at: '2026-11-13T10:15:30.000Z',
      device: {
        type: 'desktop',
        name: 'Forensics Workstation Alpha',
        os: 'macOS',
        os_version: '15.1',
        app_version: '0.1.0',
      },
      remarks: 'Primary seizure for Bharatiya Sakshya Adhiniyam 2023 compliance',
    };

    const caseResult = await createCaseFolder(tempDir, caseInput, nfs, nodeSha256);
    const caseFolder = caseResult.caseFolderPath;

    assert.ok(fs.existsSync(path.join(caseFolder, 'case.json')));
    assert.ok(fs.existsSync(path.join(caseFolder, 'manifest.json')));
    assert.ok(fs.existsSync(path.join(caseFolder, 'hashes.csv')));
    assert.ok(fs.existsSync(path.join(caseFolder, 'audit_log.jsonl')));

    // Record capture_started event
    await appendAudit(
      caseFolder,
      {
        actor: 'examiner',
        event_type: 'capture_started',
        details: { platforms: ['instagram', 'facebook'], sections: ['profile', 'feed'] },
        timestamp: '2026-11-13T10:18:00.000Z',
      },
      nfs,
      nodeSha256,
    );

    // -------------------------------------------------------------------------
    // 2. Capture and Record Evidence Screenshots with realistic dummy data
    // -------------------------------------------------------------------------
    const samplePng1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    const samplePng2 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADklEQVR42mNk+M/wHwAE/wH+j5442AAAAABJRU5ErkJggg==',
      'base64',
    );

    const record1 = await recordScreenshot(
      caseFolder,
      {
        itemId: 'ITEM-0001',
        platform: 'instagram',
        section: 'profile',
        fileContent: samplePng1,
        capturedAt: '2026-11-13T10:20:00.000Z',
      },
      nfs,
      nodeSha256,
    );

    await appendAudit(
      caseFolder,
      {
        actor: 'capture_worker',
        event_type: 'item_captured',
        details: {
          item_id: record1.item_id,
          platform: record1.platform,
          section: record1.section,
          file_path: record1.file_path,
          sha256: record1.sha256,
        },
        timestamp: '2026-11-13T10:20:00.500Z',
      },
      nfs,
      nodeSha256,
    );

    const record2 = await recordScreenshot(
      caseFolder,
      {
        itemId: 'ITEM-0002',
        platform: 'facebook',
        section: 'feed',
        fileContent: samplePng2,
        capturedAt: '2026-11-13T10:25:00.000Z',
      },
      nfs,
      nodeSha256,
    );

    await appendAudit(
      caseFolder,
      {
        actor: 'capture_worker',
        event_type: 'item_captured',
        details: {
          item_id: record2.item_id,
          platform: record2.platform,
          section: record2.section,
          file_path: record2.file_path,
          sha256: record2.sha256,
        },
        timestamp: '2026-11-13T10:25:00.500Z',
      },
      nfs,
      nodeSha256,
    );

    assert.equal(record1.item_id, 'ITEM-0001');
    assert.equal(record2.item_id, 'ITEM-0002');

    // -------------------------------------------------------------------------
    // 3. Verify Case Integrity Prior to Export
    // -------------------------------------------------------------------------
    const preExportVerification = await verifyCase(caseFolder, nfs, nodeSha256);
    assert.equal(preExportVerification.passed, true);
    assert.equal(preExportVerification.itemsChecked, 2);
    assert.equal(preExportVerification.issues.length, 0);

    // -------------------------------------------------------------------------
    // 4. Build Forensic HTML Report with Certification & QR Code
    // -------------------------------------------------------------------------
    const reportHtml = await buildReportHtml(caseFolder, nfs, {
      watermark: 'CONFIDENTIAL FORENSIC COPY',
    });

    assert.ok(reportHtml.includes('CASE-2026-8888'));
    assert.ok(reportHtml.includes('CR-542/2026'));
    assert.ok(reportHtml.includes('Deputy SP R. K. Nair'));
    assert.ok(reportHtml.includes('Certificate of Authenticity'));
    assert.ok(reportHtml.includes('Section 65B Indian Evidence Act'));
    assert.ok(reportHtml.includes('Bharatiya Sakshya Adhiniyam'));
    assert.ok(reportHtml.includes('<svg')); // SVG QR code embedded
    assert.ok(reportHtml.includes('CONFIDENTIAL FORENSIC COPY')); // Watermark embedded

    // -------------------------------------------------------------------------
    // 5. Simulate Android Export (per apps/mobile/src/export/exportCase.ts & DATA_CONTRACT §3)
    // -------------------------------------------------------------------------
    const exportDir = path.join(tempDir, 'android_exports');
    fs.mkdirSync(exportDir, { recursive: true });

    const zipFileName = 'CASE-2026-8888_20261113T103000Z.zip';
    const zipPath = path.join(exportDir, zipFileName);

    // Append case_exported event in audit log prior to archiving
    await appendAudit(
      caseFolder,
      {
        actor: 'android_app',
        event_type: 'case_exported',
        details: { zip_path: zipPath },
        timestamp: '2026-11-13T10:30:00.000Z',
      },
      nfs,
      nodeSha256,
    );

    // Create zip archive containing the case directory
    execSync(`cd "${tempDir}" && zip -r "${zipPath}" "CASE-2026-8888"`, {
      stdio: 'pipe',
    });

    // Generate .sha256 checksum sidecar file
    const zipBuffer = fs.readFileSync(zipPath);
    const zipSha256 = await nodeSha256(zipBuffer);
    const sidecarPath = `${zipPath}.sha256`;
    fs.writeFileSync(sidecarPath, `${zipSha256}  ${zipFileName}\n`, 'utf8');

    assert.ok(fs.existsSync(zipPath));
    assert.ok(fs.existsSync(sidecarPath));

    // -------------------------------------------------------------------------
    // 6. Simulate Desktop/Station Import & Checksum Verification
    // -------------------------------------------------------------------------
    const importDir = path.join(tempDir, 'desktop_imported');
    fs.mkdirSync(importDir, { recursive: true });

    // Verify sidecar checksum before extracting
    const sidecarContent = fs.readFileSync(sidecarPath, 'utf8');
    const expectedHash = sidecarContent.trim().split(/\s+/)[0];
    const actualImportedHash = await nodeSha256(fs.readFileSync(zipPath));
    assert.equal(actualImportedHash, expectedHash, 'Archive checksum must match sidecar');

    // Extract archive
    execSync(`unzip -q "${zipPath}" -d "${importDir}"`, { stdio: 'pipe' });
    const importedCaseFolder = path.join(importDir, 'CASE-2026-8888');

    // Verify imported file hashes against hashes.csv
    const hashesCsvContent = fs.readFileSync(
      path.join(importedCaseFolder, 'hashes.csv'),
      'utf8',
    );
    const lines = hashesCsvContent.trim().split('\n').slice(1); // skip header
    assert.equal(lines.length, 2);

    for (const line of lines) {
      const [_itemId, _platform, _section, relPath, expectedSha256] = line.split(',');
      const fileBytes = fs.readFileSync(path.join(importedCaseFolder, relPath));
      const calculatedSha = await nodeSha256(fileBytes);
      assert.equal(
        calculatedSha,
        expectedSha256,
        `Imported file ${relPath} SHA-256 must match hashes.csv`,
      );
    }

    // Run full verifyCase on imported folder
    const importedVerification = await verifyCase(importedCaseFolder, nfs, nodeSha256);
    assert.equal(importedVerification.passed, true);
    assert.equal(importedVerification.itemsChecked, 2);
    assert.equal(importedVerification.issues.length, 0);
  });

  test('failure case: detects modified evidence file in imported case', async () => {
    const caseInput: CreateCaseInput = {
      case_id: 'CASE-2026-0010',
      case_number: 'FIR 10/2026',
      examiner_name: 'Insp. A. Roy',
      examiner_designation: 'Forensic Analyst',
      accused_name: 'Unknown',
      agency: 'Cyber Cell',
      device: {
        type: 'android',
        name: 'Pixel 7',
        os: 'Android',
        os_version: '14',
        app_version: '0.1.0',
      },
      remarks: 'Mobile seizure test',
    };

    const result = await createCaseFolder(tempDir, caseInput, nfs, nodeSha256);
    const caseFolder = result.caseFolderPath;

    const dummyPng = Buffer.from('dummy-image-data-sample-content');
    const item = await recordScreenshot(
      caseFolder,
      {
        itemId: 'ITEM-0001',
        platform: 'instagram',
        section: 'feed',
        fileContent: dummyPng,
        capturedAt: '2026-11-13T11:00:00.000Z',
      },
      nfs,
      nodeSha256,
    );

    await appendAudit(
      caseFolder,
      {
        actor: 'capture_worker',
        event_type: 'item_captured',
        details: {
          item_id: item.item_id,
          platform: item.platform,
          section: item.section,
          file_path: item.file_path,
          sha256: item.sha256,
        },
        timestamp: '2026-11-13T11:00:00.500Z',
      },
      nfs,
      nodeSha256,
    );

    // Tamper with the evidence file (alter 1 byte)
    const filePath = path.join(caseFolder, item.file_path);
    const data = fs.readFileSync(filePath);
    data[0] ^= 0xff; // flip bits
    fs.writeFileSync(filePath, data);

    const verification = await verifyCase(caseFolder, nfs, nodeSha256);
    assert.equal(verification.passed, false);
    assert.ok(
      verification.issues.some(
        (i) => i.includes('hash_mismatch') || i.includes('Hash mismatch') || i.includes('differs'),
      ),
    );
  });

  test('failure case: detects corrupted metadata in imported case', async () => {
    const caseInput: CreateCaseInput = {
      case_id: 'CASE-2026-0011',
      case_number: 'FIR 11/2026',
      examiner_name: 'Insp. A. Roy',
      examiner_designation: 'Forensic Analyst',
      accused_name: 'Unknown',
      agency: 'Cyber Cell',
      device: {
        type: 'android',
        name: 'Pixel 7',
        os: 'Android',
        os_version: '14',
        app_version: '0.1.0',
      },
      remarks: 'Corrupted metadata test',
    };

    const result = await createCaseFolder(tempDir, caseInput, nfs, nodeSha256);
    const caseFolder = result.caseFolderPath;

    // Corrupt hashes.csv
    const hashesPath = path.join(caseFolder, 'hashes.csv');
    fs.writeFileSync(hashesPath, 'corrupted,header,without,valid,content\n');

    const verification = await verifyCase(caseFolder, nfs, nodeSha256);
    assert.equal(verification.passed, false);
    assert.ok(verification.issues.length >= 1);
  });

  test('failure case: detects missing required files in imported case', async () => {
    const caseInput: CreateCaseInput = {
      case_id: 'CASE-2026-0012',
      case_number: 'FIR 12/2026',
      examiner_name: 'Insp. A. Roy',
      examiner_designation: 'Forensic Analyst',
      accused_name: 'Unknown',
      agency: 'Cyber Cell',
      device: {
        type: 'desktop',
        name: 'Workstation',
        os: 'macOS',
        os_version: '14.0',
        app_version: '0.1.0',
      },
      remarks: 'Missing file test',
    };

    const result = await createCaseFolder(tempDir, caseInput, nfs, nodeSha256);
    const caseFolder = result.caseFolderPath;

    // Delete case.json
    fs.unlinkSync(path.join(caseFolder, 'case.json'));

    const verification = await verifyCase(caseFolder, nfs, nodeSha256);
    assert.equal(verification.passed, false);
    assert.ok(verification.issues.some((i) => i.includes('case.json') || i.includes('Missing')));
  });
});
