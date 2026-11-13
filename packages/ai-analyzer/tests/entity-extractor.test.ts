import { describe, expect, it } from 'vitest';
import { EntityExtractor } from '../src/index.js';

describe('EntityExtractor', () => {
  const extractor = new EntityExtractor();

  it('extracts emails correctly and normalizes to lowercase', () => {
    const text = 'Primary: Officer.NIA@Gov.In and backup: target_99@secure-host.org';
    const entities = extractor.extract(text);
    const emails = entities.filter((e) => e.type === 'email');

    expect(emails).toHaveLength(2);
    expect(emails[0].value).toBe('officer.nia@gov.in');
    expect(emails[1].value).toBe('target_99@secure-host.org');
    expect(emails[0].raw).toBe('Officer.NIA@Gov.In');
  });

  it('extracts URLs and shortlinks', () => {
    const text = 'Visit https://intel.agency.gov/cases or telegram link: t.me/suspect_channel and wa.me/919876543210';
    const entities = extractor.extract(text);
    const urls = entities.filter((e) => e.type === 'url');

    expect(urls).toHaveLength(3);
    expect(urls.map((u) => u.value)).toContain('https://intel.agency.gov/cases');
    expect(urls.map((u) => u.value)).toContain('https://t.me/suspect_channel');
    expect(urls.map((u) => u.value)).toContain('https://wa.me/919876543210');
  });

  it('extracts and normalizes phone numbers (international and Indian)', () => {
    const text = 'Call +91-98765-43210 or 8765432109 or intl +1 (415) 555-2671';
    const entities = extractor.extract(text);
    const phones = entities.filter((e) => e.type === 'phone');

    expect(phones.length).toBeGreaterThanOrEqual(3);
    expect(phones.map((p) => p.value)).toContain('+919876543210');
    expect(phones.map((p) => p.value)).toContain('+918765432109');
    expect(phones.map((p) => p.value)).toContain('+14155552671');
  });

  it('extracts social media @handles without mixing up emails', () => {
    const text = 'Email us at contact@domain.com or follow @nia_india and @target.acc_01.';
    const entities = extractor.extract(text);
    const handles = entities.filter((e) => e.type === 'handle');

    expect(handles.map((h) => h.value)).toContain('@nia_india');
    expect(handles.map((h) => h.value)).toContain('@target.acc_01');
    expect(handles.some((h) => h.value === '@domain.com')).toBe(false);
  });

  it('extracts Latin and Devanagari (Hindi) hashtags', () => {
    const text = 'Trending: #CyberSecurity and Hindi #जांच_अभियान and #Mission2026';
    const entities = extractor.extract(text);
    const hashtags = entities.filter((e) => e.type === 'hashtag');

    expect(hashtags).toHaveLength(3);
    expect(hashtags.map((h) => h.value)).toContain('#cybersecurity');
    expect(hashtags.map((h) => h.value)).toContain('#जांच_अभियान');
    expect(hashtags.map((h) => h.value)).toContain('#mission2026');
  });

  it('extracts various date formats and relative timestamps', () => {
    const text = 'Captured on 2026-11-12 and filed on 14/11/2026. Last active 2h ago and 15 Nov 2026.';
    const entities = extractor.extract(text);
    const dates = entities.filter((e) => e.type === 'date');

    expect(dates.map((d) => d.value)).toContain('2026-11-12');
    expect(dates.map((d) => d.value)).toContain('2026-11-14');
    expect(dates.map((d) => d.value)).toContain('2h ago');
    expect(dates.map((d) => d.value)).toContain('15 Nov 2026');
  });

  it('deduplicates entities appearing multiple times', () => {
    const text = 'Repeated @suspect_target with @suspect_target and +919876543210 with +91-98765-43210';
    const entities = extractor.extract(text);
    const handles = entities.filter((e) => e.type === 'handle');
    const phones = entities.filter((e) => e.type === 'phone');

    expect(handles).toHaveLength(1);
    expect(phones).toHaveLength(1);
  });

  it('returns empty array on empty or whitespace text', () => {
    expect(extractor.extract('')).toEqual([]);
    expect(extractor.extract('   \n\t  ')).toEqual([]);
  });
});
