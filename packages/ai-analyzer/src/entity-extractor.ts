/**
 * Entity extraction service for SocialParse.
 *
 * Extracts and normalizes:
 * - Phone numbers (Indian national, international E.164, mobile with prefix)
 * - Email addresses (RFC compliant, lowercase normalized)
 * - URLs (http/https, social links, telegram/whatsapp shortlinks)
 * - Social handles / @mentions
 * - Hashtags (Latin and Devanagari scripts)
 * - Dates (ISO, DD/MM/YYYY, textual, relative timestamps)
 */

import type { ExtractedEntity } from './types.js';

export interface EntityExtractorOptions {
  minHandleLength?: number;
}

export class EntityExtractor {
  private minHandleLength: number;

  constructor(options: EntityExtractorOptions = {}) {
    this.minHandleLength = options.minHandleLength ?? 2;
  }

  /**
   * Extracts all supported entity types from the provided text.
   */
  public extract(text: string): ExtractedEntity[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const entities: ExtractedEntity[] = [
      ...this.extractEmails(text),
      ...this.extractUrls(text),
      ...this.extractPhoneNumbers(text),
      ...this.extractHandles(text),
      ...this.extractHashtags(text),
      ...this.extractDates(text),
    ];

    return this.deduplicateEntities(entities);
  }

  /**
   * Extract email addresses.
   */
  private extractEmails(text: string): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

    let match: RegExpExecArray | null;
    while ((match = emailRegex.exec(text)) !== null) {
      const raw = match[0];
      const normalized = raw.toLowerCase();
      results.push({
        type: 'email',
        value: normalized,
        raw,
        confidence: 0.98,
        indices: [match.index, match.index + raw.length],
      });
    }

    return results;
  }

  /**
   * Extract URLs and shortlinks.
   */
  private extractUrls(text: string): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];
    // Full URLs
    const urlRegex = /\bhttps?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:?!)]/gi;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
      const raw = match[0];
      results.push({
        type: 'url',
        value: raw,
        raw,
        confidence: 0.96,
        indices: [match.index, match.index + raw.length],
      });
    }

    // Common shortlinks like t.me/user, wa.me/1234, etc.
    const shortlinkRegex = /\b(t\.me|wa\.me|bit\.ly|linktr\.ee)\/[A-Za-z0-9_+%-]+/gi;
    while ((match = shortlinkRegex.exec(text)) !== null) {
      const raw = match[0];
      // Avoid if already matched as part of http/https URL
      const hasPrefix = match.index >= 8 && text.substring(match.index - 8, match.index).includes('://');
      if (!hasPrefix) {
        results.push({
          type: 'url',
          value: `https://${raw}`,
          raw,
          confidence: 0.93,
          indices: [match.index, match.index + raw.length],
        });
      }
    }

    return results;
  }

  /**
   * Extract phone numbers with normalization.
   */
  private extractPhoneNumbers(text: string): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];

    // 1. International E.164-style (+91 98765-43210, +1-555-1234, etc.)
    const intlRegex = /(?:\+|00)\d{1,3}[\s.-]?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}\b/g;
    let match: RegExpExecArray | null;

    while ((match = intlRegex.exec(text)) !== null) {
      const raw = match[0].trim();
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        const normalized = raw.startsWith('+') ? `+${digitsOnly}` : `+${digitsOnly.replace(/^00/, '')}`;
        results.push({
          type: 'phone',
          value: normalized,
          raw,
          confidence: 0.95,
          indices: [match.index, match.index + raw.length],
        });
      }
    }

    // 2. Indian domestic 10-digit mobile numbers (6xxx to 9xxx)
    const indiaMobileRegex = /(?<![A-Za-z0-9])([6-9]\d{4}[\s.-]?\d{5})\b/g;
    while ((match = indiaMobileRegex.exec(text)) !== null) {
      const raw = match[0].trim();
      const digits = raw.replace(/\D/g, '');
      if (digits.length === 10) {
        // Check if already captured by international regex
        const idx = match.index;
        const isAlreadyCaptured = results.some(
          (r) => r.type === 'phone' && r.indices && idx >= r.indices[0] - 4 && idx <= r.indices[1],
        );
        if (!isAlreadyCaptured) {
          results.push({
            type: 'phone',
            value: `+91${digits}`,
            raw,
            confidence: 0.9,
            indices: [match.index, match.index + raw.length],
          });
        }
      }
    }

    return results;
  }

  /**
   * Extract social media @handles (excluding email parts).
   */
  private extractHandles(text: string): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];
    const handleRegex = /(?<![A-Za-z0-9_.-])@([A-Za-z0-9_.]{2,30})\b/g;

    let match: RegExpExecArray | null;
    while ((match = handleRegex.exec(text)) !== null) {
      const raw = match[0];
      const username = match[1];

      // Exclude handles ending in dot or containing double dots
      if (username.endsWith('.') || username.includes('..') || username.length < this.minHandleLength) {
        continue;
      }

      results.push({
        type: 'handle',
        value: `@${username.toLowerCase()}`,
        raw,
        confidence: 0.94,
        indices: [match.index, match.index + raw.length],
      });
    }

    return results;
  }

  /**
   * Extract hashtags (supporting Latin and Devanagari script).
   */
  private extractHashtags(text: string): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];
    const hashtagRegex =
      /(?<![\w\p{sc=Devanagari}])#([\w\p{sc=Devanagari}]{2,50})(?![\w\p{sc=Devanagari}])/gu;

    let match: RegExpExecArray | null;
    while ((match = hashtagRegex.exec(text)) !== null) {
      const raw = match[0];
      const tag = match[1];

      results.push({
        type: 'hashtag',
        value: `#${tag.toLowerCase()}`,
        raw,
        confidence: 0.92,
        indices: [match.index, match.index + raw.length],
      });
    }

    return results;
  }

  /**
   * Extract dates and relative timestamps.
   */
  private extractDates(text: string): ExtractedEntity[] {
    const results: ExtractedEntity[] = [];

    // 1. ISO format: YYYY-MM-DD
    const isoRegex = /\b(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;
    let match: RegExpExecArray | null;
    while ((match = isoRegex.exec(text)) !== null) {
      const raw = match[0];
      results.push({
        type: 'date',
        value: raw,
        raw,
        confidence: 0.98,
        indices: [match.index, match.index + raw.length],
      });
    }

    // 2. DD/MM/YYYY or DD-MM-YYYY
    const dmyRegex = /\b(0[1-9]|[12]\d|3[01])[/-](0[1-9]|1[0-2])[/-](\d{4})\b/g;
    while ((match = dmyRegex.exec(text)) !== null) {
      const raw = match[0];
      const parts = raw.split(/[/-]/);
      const normalized = `${parts[2]}-${parts[1]}-${parts[0]}`;
      results.push({
        type: 'date',
        value: normalized,
        raw,
        confidence: 0.92,
        indices: [match.index, match.index + raw.length],
      });
    }

    // 3. Named month dates: e.g. "12 Nov 2026", "November 12, 2026"
    const namedDateRegex =
      /\b(0?[1-9]|[12]\d|3[01])\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(\d{4})\b/gi;
    while ((match = namedDateRegex.exec(text)) !== null) {
      const raw = match[0];
      results.push({
        type: 'date',
        value: raw.trim(),
        raw,
        confidence: 0.9,
        indices: [match.index, match.index + raw.length],
      });
    }

    // 4. Relative time indicators (e.g. "2h ago", "3 days ago")
    const relativeTimeRegex = /\b\d+\s*(?:m|min|mins|h|hr|hrs|d|days?|w|weeks?|mo|months?)\s+ago\b/gi;
    while ((match = relativeTimeRegex.exec(text)) !== null) {
      const raw = match[0];
      results.push({
        type: 'date',
        value: raw.toLowerCase(),
        raw,
        confidence: 0.85,
        indices: [match.index, match.index + raw.length],
      });
    }

    return results;
  }

  /**
   * Deduplicates entities with the exact same type and normalized value.
   */
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    const deduplicated: ExtractedEntity[] = [];

    for (const entity of entities) {
      const key = `${entity.type}:${entity.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(entity);
      }
    }

    return deduplicated;
  }
}
