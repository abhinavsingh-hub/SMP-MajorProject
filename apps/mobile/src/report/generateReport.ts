import { appendAudit, buildReportHtml, verifyCase } from '@smp/core';
import RNFS from 'react-native-fs';
import { generatePDF } from 'react-native-html-to-pdf';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { RnFileSystem } from '../evidence/RnFileSystem';
import { hashFileSha256, rnSha256 } from '../evidence/sha256';

const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
export interface GenerateReportOptions { maxImagesPerPlatform?: number }
export interface GenerateReportResult { pdfPath: string; sha256: string; pageCount?: number }

function injectCover(html: string, verification: { passed: boolean; issues: string[] }, capOmissions: string[], unavailable: string[]): string {
  const heading = verification.passed
    ? '<div class="integrity-status">INTEGRITY CHECK PASSED</div>'
    : `<div class="integrity-status" style="color:#b91c1c;font-weight:bold">INTEGRITY CHECK FAILED</div><ul>${verification.issues.map((issue) => `<li>${issue.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))}</li>`).join('')}</ul>`;
  const capNote = capOmissions.length ? `<p>Images omitted because of the per-platform image cap: ${capOmissions.join(', ')}</p>` : '';
  const unavailableNote = unavailable.length ? `<p>Images unavailable for rendering: ${unavailable.join(', ')}</p>` : '';
  const coverContent = `${heading}${capNote}${unavailableNote}`;
  const htmlWithBanner = html.replace('<div class="cover-header">', `<div class="cover-header">${coverContent}`);
  return htmlWithBanner === html ? html.replace('<body>', `<body>${coverContent}`) : htmlWithBanner;
}

export async function generateReport(caseDir: string, options: GenerateReportOptions = {}): Promise<GenerateReportResult> {
  const cap = Math.max(0, Math.floor(options.maxImagesPerPlatform ?? 40));
  const fs = new RnFileSystem();
  const verification = await verifyCase(caseDir, fs, rnSha256);
  const [caseRaw, manifestRaw] = await Promise.all([
    RNFS.readFile(`${caseDir}/case.json`, 'utf8'),
    RNFS.readFile(`${caseDir}/manifest.json`, 'utf8'),
  ]);
  const caseId = (JSON.parse(caseRaw) as { case_id: string }).case_id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const items = (JSON.parse(manifestRaw) as { items: Array<{ platform: string; file_path: string }> }).items ?? [];
  const imagesBase64: Record<string, string> = {};
  const capOmissions: string[] = [];
  const unavailable: string[] = [];
  const tempDir = `${RNFS.CachesDirectoryPath}/report-images-${Date.now()}`;
  const pdfTempDir = `${RNFS.ExternalDirectoryPath}/report-temp`;
  const resizedPaths: string[] = [];
  let renderedPdf: string | undefined;
  await RNFS.mkdir(tempDir);
  try {
    const platforms = [...new Set(items.map((item) => item.platform))];
    let resizedIndex = 0;
    for (const platform of platforms) {
      let considered = 0;
      let capOmitted = 0;
      let failed = 0;
      for (const item of items.filter((entry) => entry.platform === platform)) {
        const source = `${caseDir}/${item.file_path}`;
        if (considered >= cap) {
          imagesBase64[item.file_path] = PLACEHOLDER;
          capOmitted++;
          continue;
        }
        considered++;
        try {
          const resized = await ImageResizer.createResizedImage(source, 1080, 1920, 'JPEG', 72, 0, `${tempDir}/${resizedIndex++}.jpg`, false, { mode: 'contain', onlyScaleDown: true });
          resizedPaths.push(resized.path);
          const base64 = await RNFS.readFile(resized.path, 'base64');
          imagesBase64[item.file_path] = `data:image/jpeg;base64,${base64}`;
        } catch {
          imagesBase64[item.file_path] = PLACEHOLDER;
          failed++;
        }
      }
      if (capOmitted) capOmissions.push(`${platform}: ${capOmitted}`);
      if (failed) unavailable.push(`${platform}: ${failed}`);
    }

    let html = await buildReportHtml(caseDir, fs, { imagesBase64 });
    html = injectCover(html, verification, capOmissions, unavailable);
    await RNFS.mkdir(pdfTempDir);
    const generated = await generatePDF({ html, fileName: `${caseId}_report`, directory: 'report-temp' });
    if (!generated.filePath) throw new Error('PDF renderer did not return a file path.');
    renderedPdf = generated.filePath;
    const reportDir = `${caseDir}/report`;
    await RNFS.mkdir(reportDir);
    const pdfPath = `${reportDir}/${caseId}_report.pdf`;
    if (await RNFS.exists(pdfPath)) await RNFS.unlink(pdfPath);
    await RNFS.copyFile(renderedPdf, pdfPath);
    const sha256 = await hashFileSha256(pdfPath);
    await appendAudit(caseDir, { actor: 'android_app', event_type: 'report_generated', details: { path: pdfPath, sha256 } }, fs, rnSha256);
    return { pdfPath, sha256, ...(typeof generated.numberOfPages === 'number' ? { pageCount: generated.numberOfPages } : {}) };
  } finally {
    for (const path of resizedPaths) if (await RNFS.exists(path)) await RNFS.unlink(path);
    if (renderedPdf && await RNFS.exists(renderedPdf)) await RNFS.unlink(renderedPdf);
    if (await RNFS.exists(tempDir)) await RNFS.unlink(tempDir);
  }
}
