import { describe, expect, it } from 'vitest';
import { QualityChecker } from '../src/index.js';

describe('QualityChecker', () => {
  const checker = new QualityChecker();

  it('detects FLAG_SECURE_BLOCKED on pitch black screenshots', () => {
    const blackPng = QualityChecker.createSyntheticPng({
      width: 40,
      height: 40,
      fillColor: [0, 0, 0],
      pattern: 'solid',
    });

    const result = checker.assess(blackPng, 'ITEM-0001');

    expect(result.flags).toContain('FLAG_SECURE_BLOCKED');
    expect(result.assessment.isBlackOrBlank).toBe(true);
    expect(result.assessment.brightnessScore).toBeLessThanOrEqual(5);
  });

  it('detects BLANK_SCREEN on uniform solid white screenshots', () => {
    const whitePng = QualityChecker.createSyntheticPng({
      width: 40,
      height: 40,
      fillColor: [255, 255, 255],
      pattern: 'solid',
    });

    const result = checker.assess(whitePng, 'ITEM-0002');

    expect(result.flags).toContain('BLANK_SCREEN');
    expect(result.assessment.isBlackOrBlank).toBe(true);
    expect(result.flags).not.toContain('FLAG_SECURE_BLOCKED');
  });

  it('evaluates sharp patterned screenshots with high blur score and no quality flags', () => {
    const checkerboardPng = QualityChecker.createSyntheticPng({
      width: 48,
      height: 48,
      pattern: 'checkerboard',
    });

    const result = checker.assess(checkerboardPng, 'ITEM-0003');

    expect(result.flags).not.toContain('FLAG_SECURE_BLOCKED');
    expect(result.flags).not.toContain('BLANK_SCREEN');
    expect(result.flags).not.toContain('BLURRY');
    expect(result.assessment.blurScore).toBeGreaterThan(20);
  });

  it('detects duplicates using perceptual difference hashing (dHash)', () => {
    const freshChecker = new QualityChecker();

    const originalPng = QualityChecker.createSyntheticPng({
      width: 32,
      height: 32,
      pattern: 'gradient',
    });

    const duplicatePng = QualityChecker.createSyntheticPng({
      width: 32,
      height: 32,
      pattern: 'gradient',
    });

    const res1 = freshChecker.assess(originalPng, 'ITEM-0001');
    expect(res1.flags).not.toContain('DUPLICATE');
    expect(res1.assessment.perceptualHash).toBeDefined();

    const res2 = freshChecker.assess(duplicatePng, 'ITEM-0002');
    expect(res2.flags).toContain('DUPLICATE');
    expect(res2.assessment.isDuplicate).toBe(true);
    expect(res2.assessment.duplicateOfId).toBe('ITEM-0001');
  });

  it('handles corrupt image buffers gracefully without crashing', () => {
    const corruptBuffer = Buffer.from('not a real png header content');
    const result = checker.assess(corruptBuffer, 'ITEM-CORRUPT');

    expect(result.flags).toContain('BLANK_SCREEN');
    expect(result.assessment.isBlackOrBlank).toBe(true);
  });
});
