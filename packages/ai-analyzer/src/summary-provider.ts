/**
 * Pluggable summary provider architecture for SocialParse.
 *
 * Provides investigative summarization:
 * - ISummaryProvider interface
 * - RuleBasedSummaryProvider (default, 100% offline, deterministic, zero-network)
 *
 * Enforces evidence privacy: no data sent off-machine by default,
 * sensitive credentials automatically redacted.
 */

import type { AnalysisFlag, ExtractedEntity, SectionCategory } from './types.js';

export interface SummaryContext {
  screenshotId: string;
  platform: string;
  section: string;
  category: SectionCategory;
  ocrText: string;
  entities: ExtractedEntity[];
  flags: AnalysisFlag[];
  caseNumber?: string;
  accusedName?: string;
}

export interface SummaryResult {
  summary: string;
  model: string;
  confidence: number;
  sanitized: boolean;
}

export interface ISummaryProvider {
  readonly name: string;
  summarize(context: SummaryContext): Promise<SummaryResult>;
}

/**
 * Default offline rule-based summary provider.
 * Runs completely locally without network or external API dependencies.
 */
export class RuleBasedSummaryProvider implements ISummaryProvider {
  public readonly name = 'rule-based@1.0.0';

  public async summarize(context: SummaryContext): Promise<SummaryResult> {
    const { platform, section, category, entities, flags, ocrText } = context;

    // Check for sensitive credential patterns and redact
    const { sanitizedText, hasCredentials } = this.sanitizeCredentials(ocrText);

    // 1. High-priority anomaly flags
    if (flags.includes('FLAG_SECURE_BLOCKED')) {
      return {
        summary: `ALERT: Screen content on ${platform} (${section}) was blocked by the operating system (Android FLAG_SECURE). Display rendered pitch black.`,
        model: this.name,
        confidence: 0.99,
        sanitized: hasCredentials,
      };
    }

    if (flags.includes('BLANK_SCREEN')) {
      return {
        summary: `Capture on ${platform} (${section}) appears blank or unrendered with no visible interface elements.`,
        model: this.name,
        confidence: 0.95,
        sanitized: hasCredentials,
      };
    }

    if (flags.includes('DUPLICATE')) {
      return {
        summary: `Duplicate capture detected on ${platform} (${section}); visual content is perceptually identical to an earlier item in the sequence.`,
        model: this.name,
        confidence: 0.95,
        sanitized: hasCredentials,
      };
    }

    // 2. Synthesize investigative findings by category
    const handles = entities.filter((e) => e.type === 'handle').map((e) => e.value);
    const phones = entities.filter((e) => e.type === 'phone').map((e) => e.value);
    const emails = entities.filter((e) => e.type === 'email').map((e) => e.value);
    const urls = entities.filter((e) => e.type === 'url').map((e) => e.value);
    const hashtags = entities.filter((e) => e.type === 'hashtag').map((e) => e.value);

    const parts: string[] = [];

    // Prefix with platform and category description
    const formattedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
    parts.push(`${formattedPlatform} ${this.formatCategoryName(category)} view (${section}).`);

    if (handles.length > 0) {
      parts.push(`User handles: ${handles.slice(0, 3).join(', ')}${handles.length > 3 ? '...' : ''}.`);
    }

    if (phones.length > 0 || emails.length > 0) {
      const contacts = [...phones, ...emails];
      parts.push(`Contact info: ${contacts.slice(0, 3).join(', ')}.`);
    }

    if (urls.length > 0) {
      parts.push(`Associated links: ${urls.slice(0, 2).join(', ')}.`);
    }

    if (hashtags.length > 0) {
      parts.push(`Tags: ${hashtags.slice(0, 3).join(' ')}.`);
    }

    // If text was present but few entities extracted, provide text snippet
    if (entities.length === 0 && sanitizedText.length > 0) {
      const cleanSnippet = sanitizedText
        .replace(/\s+/g, ' ')
        .substring(0, 100)
        .trim();
      parts.push(`Content preview: "${cleanSnippet}${sanitizedText.length > 100 ? '...' : ''}".`);
    } else if (entities.length === 0) {
      parts.push('No prominent text or investigative entities identified in this capture.');
    }

    if (hasCredentials) {
      parts.push('[Note: Potential sensitive credentials/tokens in source view were sanitized].');
    }

    return {
      summary: parts.join(' '),
      model: this.name,
      confidence: 0.9,
      sanitized: hasCredentials,
    };
  }

  private formatCategoryName(category: SectionCategory): string {
    switch (category) {
      case 'profile':
        return 'account profile';
      case 'posts':
        return 'posts feed/timeline';
      case 'messages':
        return 'direct messages/chat';
      case 'followers':
        return 'followers list';
      case 'following':
        return 'following list';
      case 'account_info':
        return 'account information';
      case 'security':
        return 'security & authentication settings';
      default:
        return 'interface';
    }
  }

  /**
   * Redacts suspected passwords, authorization tokens, or secret keys.
   */
  private sanitizeCredentials(text: string): { sanitizedText: string; hasCredentials: boolean } {
    let sanitized = text;
    let hasCredentials = false;

    const credentialPatterns = [
      /(?:password|passwd|pwd)[\s:=]+([^\s]+)/gi,
      /(?:bearer\s+)([A-Za-z0-9_.-]{20,})/gi,
      /(?:token|secret|key)[\s:=]+([A-Za-z0-9_.-]{16,})/gi,
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(sanitized)) {
        hasCredentials = true;
        sanitized = sanitized.replace(pattern, (match, cred) => match.replace(cred, '[REDACTED_CREDENTIAL]'));
      }
    }

    return { sanitizedText: sanitized, hasCredentials };
  }
}
