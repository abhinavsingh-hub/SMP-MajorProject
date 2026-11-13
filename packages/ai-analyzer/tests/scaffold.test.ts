import { describe, expect, it } from 'vitest';
import { AI_ANALYZER_VERSION } from '../src/index.js';

describe('ai-analyzer scaffold', () => {
  it('exports valid version string', () => {
    expect(AI_ANALYZER_VERSION).toBe('0.1.0');
  });
});

