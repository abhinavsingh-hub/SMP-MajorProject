jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    CachesDirectoryPath: '/cache', ExternalDirectoryPath: '/external',
    readFile: jest.fn(async (path: string) => path.endsWith('case.json')
      ? JSON.stringify({ case_id: 'CASE-1' })
      : path.endsWith('manifest.json')
        ? JSON.stringify({ items: [1, 2, 3].map((n) => ({ platform: 'instagram', file_path: `instagram/screenshots/${n}.png` })) })
        : 'aGVp'),
    mkdir: jest.fn(async () => undefined), exists: jest.fn(async () => false), unlink: jest.fn(async () => undefined),
    copyFile: jest.fn(async () => undefined), hash: jest.fn(async () => 'pdf-sha'),
  },
}));
jest.mock('react-native-html-to-pdf', () => ({ generatePDF: jest.fn(async ({ html }: { html: string }) => {
  (global as { __pdfHtml?: string }).__pdfHtml = html;
  return { filePath: '/external/report-temp/CASE-1_report.pdf', numberOfPages: 2 };
}) }));
jest.mock('@bam.tech/react-native-image-resizer', () => ({ __esModule: true, default: { createResizedImage: jest.fn(async (_uri: string, _w: number, _h: number, _format: string, _quality: number, _rotation: number, outputPath: string) => ({ path: outputPath })) } }));
jest.mock('@smp/core', () => ({
  verifyCase: jest.fn(async () => ({ passed: false, issues: ['hash mismatch'], itemsChecked: 3 })),
  buildReportHtml: jest.fn(async (_dir: string, _fs: unknown, options: { imagesBase64: Record<string, string> }) => {
    (global as { __images?: Record<string, string> }).__images = options.imagesBase64;
    return '<html><body><div class="cover-header">Cover</div></body></html>';
  }),
  appendAudit: jest.fn(async () => undefined),
}));

import RNFS from 'react-native-fs';
import { appendAudit, buildReportHtml } from '@smp/core';
import { generatePDF } from 'react-native-html-to-pdf';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { generateReport } from '../src/report/generateReport';

describe('generateReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (global as { __images?: unknown }).__images;
    delete (global as { __pdfHtml?: unknown }).__pdfHtml;
  });

  it('applies per-platform image cap, marks failed integrity, and audits the generated report', async () => {
    const result = await generateReport('/case', { maxImagesPerPlatform: 1 });
    expect(ImageResizer.createResizedImage).toHaveBeenCalledTimes(1);
    const images = (global as { __images: Record<string, string> }).__images;
    expect(Object.keys(images)).toHaveLength(3);
    expect(images['instagram/screenshots/2.png']).toContain('R0lGOD');
    expect((global as { __pdfHtml: string }).__pdfHtml).toContain('INTEGRITY CHECK FAILED');
    expect((global as { __pdfHtml: string }).__pdfHtml).toContain('instagram: 2');
    expect(result).toEqual({ pdfPath: '/case/report/CASE-1_report.pdf', sha256: 'pdf-sha', pageCount: 2 });
    expect(RNFS.copyFile).toHaveBeenCalled();
    expect(appendAudit).toHaveBeenCalledWith('/case', expect.objectContaining({ event_type: 'report_generated', details: { path: result.pdfPath, sha256: 'pdf-sha' } }), expect.anything(), expect.any(Function));
    expect(generatePDF).toHaveBeenCalled();
    expect(buildReportHtml).toHaveBeenCalled();
  });
});
