import { describe, expect, it } from 'vitest';
import {
  MockOcrEngine,
  OcrService,
  TesseractOcrEngine,
} from '../src/index.js';

describe('OcrService', () => {
  it('recognizes text with MockOcrEngine and normalizes spacing', async () => {
    const mockEngine = new MockOcrEngine(
      'Target User: @suspect_001 \r\n\r\n\r\n Contact: +919876543210   \t Email: intel@domain.com  \n\n\nसंदिग्ध गतिविधि',
    );
    const service = new OcrService({ engine: mockEngine });

    const result = await service.recognize('dummy-path.png');

    expect(result.text).toContain('@suspect_001');
    expect(result.text).toContain('+919876543210');
    expect(result.text).toContain('संदिग्ध गतिविधि');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.words.length).toBeGreaterThan(0);
    expect(result.text).not.toContain('\r\n');
    expect(result.text).not.toMatch(/\n{3,}/);

    await service.terminate();
  });

  it('supports path-specific results in MockOcrEngine', async () => {
    const mockEngine = new MockOcrEngine('default fallback');
    mockEngine.setMockResult('target_profile.png', 'Followers: 12.5k Following: 120');

    const service = new OcrService({ engine: mockEngine });

    const profileResult = await service.recognize('target_profile.png');
    expect(profileResult.text).toBe('Followers: 12.5k Following: 120');

    const otherResult = await service.recognize('other.png');
    expect(otherResult.text).toBe('default fallback');

    await service.terminate();
  });

  it('initializes TesseractOcrEngine with bilingual language tags', () => {
    const tesseractEngine = new TesseractOcrEngine(['eng', 'hin']);
    expect(tesseractEngine).toBeInstanceOf(TesseractOcrEngine);
  });
});
