/**
 * Unit tests for P3-09: Hash appendix, certification block, QR code, and watermark.
 *
 * Requirements:
 * - Hash table appendix
 * - Signature lines for examiner and two witnesses (Panchnama)
 * - QR code containing case ID and hash of hashes.csv
 * - Optional watermark
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDemoReportHtml,
  generateQrSvg,
  generateQrMatrix,
  DEMO_CASE,
} from '../src/index.ts';

describe('QR Code generator (qrcode.ts)', () => {
  it('generates valid QR matrix and SVG for case ID and hash', () => {
    const text = `Case ID: ${DEMO_CASE.case_id}\nHashes: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
    const matrix = generateQrMatrix(text);

    assert.ok(Array.isArray(matrix));
    assert.ok(matrix.length > 20, 'Matrix size should be at least 21x21');
    assert.equal(matrix.length, matrix[0].length, 'Matrix must be square');

    const svg = generateQrSvg(text, { size: 150 });
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('viewBox='));
    assert.ok(svg.includes('width="150"'));
    assert.ok(svg.includes('<rect'));
  });
});

describe('Report Appendix, Certification, QR Code and Watermark (P3-09)', () => {
  it('renders hash table appendix with complete cryptographic details', () => {
    const html = buildDemoReportHtml();

    assert.ok(
      html.includes('Appendix: Cryptographic Hash Register'),
      'Must contain appendix heading',
    );
    assert.ok(html.includes('hashes.csv SHA-256:'), 'Must show hashes.csv hash');
    assert.ok(html.includes('ITEM-0001'));
    assert.ok(html.includes('ITEM-0004'));
    assert.ok(html.includes('482,113 B'));
    assert.ok(
      html.includes('db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376'),
    );
  });

  it('renders Section 65B / BSA Panchnama certification block with 3 signature areas', () => {
    const html = buildDemoReportHtml();

    assert.ok(
      html.includes('Certificate of Authenticity of Electronic Evidence'),
      'Must contain certificate title',
    );
    assert.ok(
      html.includes('Section 65B Indian Evidence Act'),
      'Must cite Section 65B',
    );
    assert.ok(
      html.includes('Section 63 Bharatiya Sakshya Adhiniyam'),
      'Must cite BSA Section 63',
    );

    // Examiner signature
    assert.ok(html.includes('Examiner Signature &amp; Seal') || html.includes('Examiner Signature & Seal'));
    assert.ok(html.includes('Priya Deshmukh'));
    assert.ok(html.includes('Sub-Inspector'));

    // Official unit seal
    assert.ok(html.includes('Official Unit Seal'));

    // Independent Witness 1 (Panch 1)
    assert.ok(
      html.includes('Independent Witness 1 (Panch 1)'),
      'Must include Panch 1 signature block',
    );

    // Independent Witness 2 (Panch 2)
    assert.ok(
      html.includes('Independent Witness 2 (Panch 2)'),
      'Must include Panch 2 signature block',
    );
  });

  it('embeds QR code containing case ID and hash of hashes.csv', () => {
    const customHash = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef';
    const html = buildDemoReportHtml({ hashesCsvSha256: customHash });

    assert.ok(html.includes('Cryptographic Authenticity QR Code'));
    assert.ok(html.includes(customHash));
    assert.ok(html.includes('<svg'));
  });

  it('renders watermark overlay when watermark option is passed', () => {
    const watermarkText = 'CONFIDENTIAL EVIDENCE';
    const htmlWithWatermark = buildDemoReportHtml({ watermark: watermarkText });

    assert.ok(htmlWithWatermark.includes('watermark-overlay'));
    assert.ok(htmlWithWatermark.includes(watermarkText));
    assert.ok(htmlWithWatermark.includes('transform: rotate(-35deg)'));

    // Verify when watermark is omitted, no watermark-overlay is rendered
    const htmlWithoutWatermark = buildDemoReportHtml();
    assert.ok(!htmlWithoutWatermark.includes('<div class="watermark-overlay">'));
  });
});
