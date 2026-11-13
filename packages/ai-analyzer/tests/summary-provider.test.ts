import { describe, expect, it } from 'vitest';
import { RuleBasedSummaryProvider, type SummaryContext } from '../src/index.js';

describe('RuleBasedSummaryProvider', () => {
  const provider = new RuleBasedSummaryProvider();

  it('produces a structured investigative summary from entities', async () => {
    const context: SummaryContext = {
      screenshotId: 'ITEM-0001',
      platform: 'instagram',
      section: 'profile',
      category: 'profile',
      ocrText: 'Target user profile with bio information',
      entities: [
        { type: 'handle', value: '@target_01', raw: '@target_01', confidence: 0.95 },
        { type: 'phone', value: '+919876543210', raw: '+919876543210', confidence: 0.9 },
        { type: 'url', value: 'https://t.me/intel_channel', raw: 't.me/intel_channel', confidence: 0.9 },
      ],
      flags: [],
    };

    const result = await provider.summarize(context);

    expect(result.model).toBe('rule-based@1.0.0');
    expect(result.summary).toContain('Instagram account profile');
    expect(result.summary).toContain('@target_01');
    expect(result.summary).toContain('+919876543210');
    expect(result.summary).toContain('https://t.me/intel_channel');
    expect(result.sanitized).toBe(false);
  });

  it('summarizes FLAG_SECURE_BLOCKED screenshots with forensic alert', async () => {
    const context: SummaryContext = {
      screenshotId: 'ITEM-0002',
      platform: 'telegram',
      section: 'secret_chat',
      category: 'messages',
      ocrText: '',
      entities: [],
      flags: ['FLAG_SECURE_BLOCKED'],
    };

    const result = await provider.summarize(context);

    expect(result.summary).toContain('ALERT: Screen content on telegram');
    expect(result.summary).toContain('Android FLAG_SECURE');
    expect(result.confidence).toBe(0.99);
  });

  it('summarizes BLANK_SCREEN and DUPLICATE flags', async () => {
    const blankContext: SummaryContext = {
      screenshotId: 'ITEM-0003',
      platform: 'facebook',
      section: 'feed',
      category: 'posts',
      ocrText: '',
      entities: [],
      flags: ['BLANK_SCREEN'],
    };

    const blankResult = await provider.summarize(blankContext);
    expect(blankResult.summary).toContain('blank or unrendered');

    const dupContext: SummaryContext = {
      screenshotId: 'ITEM-0004',
      platform: 'x',
      section: 'timeline',
      category: 'posts',
      ocrText: 'Post text',
      entities: [],
      flags: ['DUPLICATE'],
    };

    const dupResult = await provider.summarize(dupContext);
    expect(dupResult.summary).toContain('Duplicate capture detected');
  });

  it('redacts exposed passwords or auth tokens from input view', async () => {
    const context: SummaryContext = {
      screenshotId: 'ITEM-0005',
      platform: 'google',
      section: 'security',
      category: 'security',
      ocrText: 'Account Login Password: SecretP@ssw0rd123! and token: abcd1234efgh5678ijkl',
      entities: [],
      flags: [],
    };

    const result = await provider.summarize(context);

    expect(result.summary).not.toContain('SecretP@ssw0rd123!');
    expect(result.sanitized).toBe(true);
    expect(result.summary).toContain('[Note: Potential sensitive credentials/tokens');
  });
});
