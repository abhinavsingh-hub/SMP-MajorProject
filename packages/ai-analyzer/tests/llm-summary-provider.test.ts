import { describe, expect, it } from 'vitest';
import {
  ClaudeSummaryProvider,
  GeminiSummaryProvider,
  type SummaryContext,
} from '../src/index.js';

describe('LLM Summary Providers', () => {
  const sampleContext: SummaryContext = {
    screenshotId: 'ITEM-0001',
    platform: 'instagram',
    section: 'profile',
    category: 'profile',
    ocrText: 'Target account info: @suspect_target',
    entities: [{ type: 'handle', value: '@suspect_target', raw: '@suspect_target', confidence: 0.95 }],
    flags: [],
  };

  it('enforces privacy guard when allowExternalApi is false', async () => {
    let fetchCalled = false;
    const mockFetch = (async () => {
      fetchCalled = true;
      return new Response('{}');
    }) as unknown as typeof fetch;

    const provider = new GeminiSummaryProvider({
      allowExternalApi: false,
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    const result = await provider.summarize(sampleContext);

    expect(fetchCalled).toBe(false);
    expect(result.model).toBe('rule-based@1.0.0');
    expect(result.summary).toContain('Instagram account profile');
  });

  it('throws privacy error when allowExternalApi is false and fallback is disabled', async () => {
    const provider = new GeminiSummaryProvider({
      allowExternalApi: false,
      fallbackToRuleBased: false,
    });

    await expect(provider.summarize(sampleContext)).rejects.toThrow(/Evidence privacy policy/);
  });

  it('calls Gemini endpoint when opted in with mock fetch', async () => {
    const mockFetch = (async (url: string, init?: RequestInit) => {
      expect(url).toContain('https://generativelanguage.googleapis.com');
      const body = JSON.parse(init?.body as string);
      expect(body.contents).toBeDefined();

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Gemini generated investigative summary for target profile.' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const provider = new GeminiSummaryProvider({
      allowExternalApi: true,
      apiKey: 'mock-gemini-key',
      fetchFn: mockFetch,
    });

    const result = await provider.summarize(sampleContext);

    expect(result.summary).toBe('Gemini generated investigative summary for target profile.');
    expect(result.model).toBe('gemini:gemini-1.5-flash');
    expect(result.confidence).toBe(0.94);
  });

  it('calls Claude endpoint when opted in with mock fetch', async () => {
    const mockFetch = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      const headers = init?.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('mock-claude-key');

      return new Response(
        JSON.stringify({
          content: [{ text: 'Claude generated investigative summary for target account.' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const provider = new ClaudeSummaryProvider({
      allowExternalApi: true,
      apiKey: 'mock-claude-key',
      fetchFn: mockFetch,
    });

    const result = await provider.summarize(sampleContext);

    expect(result.summary).toBe('Claude generated investigative summary for target account.');
    expect(result.model).toBe('claude:claude-3-haiku-20240307');
  });

  it('falls back gracefully to rule-based summary on network error', async () => {
    const failingFetch = (async () => {
      return new Response('Internal Server Error', { status: 500 });
    }) as unknown as typeof fetch;

    const provider = new GeminiSummaryProvider({
      allowExternalApi: true,
      apiKey: 'mock-key',
      fetchFn: failingFetch,
      fallbackToRuleBased: true,
    });

    const result = await provider.summarize(sampleContext);
    expect(result.model).toBe('rule-based@1.0.0');
    expect(result.summary).toContain('[Gemini offline fallback:');
  });
});
