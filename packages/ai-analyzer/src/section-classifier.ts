/**
 * Section classification service for SocialParse.
 *
 * Classifies social media feeds and screens into standardized categories:
 * - profile
 * - posts (feed/timeline)
 * - messages (chats/DMs)
 * - followers
 * - following
 * - account_info
 * - security
 * - other
 *
 * Employs keyword lexicons (English and Hindi), platform-specific UI patterns,
 * and manifest hint weighting.
 */

import type { SectionCategory } from './types.js';

export interface SectionClassificationResult {
  category: SectionCategory;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

export interface SectionClassifierOptions {
  manifestHintWeight?: number;
}

interface CategoryRule {
  category: SectionCategory;
  keywords: string[];
  weight: number;
}

export class SectionClassifier {
  private manifestHintWeight: number;

  private rules: CategoryRule[] = [
    {
      category: 'profile',
      keywords: [
        'edit profile',
        'bio',
        'joined',
        'website',
        'profile photo',
        'threads.net',
        'highlights',
        'about info',
        'प्रोफ़ाइल',
        'बायो',
        'परिचय',
      ],
      weight: 1.0,
    },
    {
      category: 'followers',
      keywords: [
        'followers',
        'followed by',
        'follower count',
        'subscribers',
        'सदस्य',
        'फ़ॉलोअर्स',
        'फॉलोअर्स',
      ],
      weight: 1.2,
    },
    {
      category: 'following',
      keywords: [
        'following',
        'unfollow',
        'mutual',
        'subscriptions',
        'फॉलो कर रहे हैं',
        'फ़ॉलो कर रहे हैं',
      ],
      weight: 1.2,
    },
    {
      category: 'messages',
      keywords: [
        'direct',
        'messages',
        'chats',
        'dm',
        'inbox',
        'type a message',
        'online',
        'last seen',
        'voice note',
        'forwarded',
        'read receipt',
        'चैट',
        'संदेश',
        'मैसेज',
        'वार्तालाप',
      ],
      weight: 1.1,
    },
    {
      category: 'posts',
      keywords: [
        'feed',
        'posts',
        'timeline',
        'retweet',
        'repost',
        'comment',
        'likes',
        'share',
        'tagged in',
        'tweets',
        'पोस्ट',
        'टाइमलाइन',
        'टिप्पणी',
        'साझा',
      ],
      weight: 0.9,
    },
    {
      category: 'account_info',
      keywords: [
        'account info',
        'personal details',
        'phone number',
        'email address',
        'date of birth',
        'birthday',
        'gender',
        'account details',
        'manage your google account',
        'खाता जानकारी',
        'व्यक्तिगत विवरण',
        'खाता सेटिंग्स',
      ],
      weight: 1.1,
    },
    {
      category: 'security',
      keywords: [
        'password',
        '2-step verification',
        'two-factor',
        'security settings',
        'login activity',
        'devices logged in',
        'active sessions',
        'passkey',
        'authenticator',
        'सुरक्षा',
        'पासवर्ड',
        'सत्यापन',
      ],
      weight: 1.3,
    },
  ];

  constructor(options: SectionClassifierOptions = {}) {
    this.manifestHintWeight = options.manifestHintWeight ?? 0.35;
  }

  /**
   * Classifies a screenshot based on OCR text, platform, and manifest section hint.
   */
  public classify(
    ocrText: string,
    platform: string,
    hintSection?: string,
  ): SectionClassificationResult {
    const textLower = ocrText.toLowerCase();
    const scores = new Map<SectionCategory, { score: number; matches: string[] }>();

    for (const rule of this.rules) {
      scores.set(rule.category, { score: 0, matches: [] });
    }

    // Keyword matching
    for (const rule of this.rules) {
      const entry = scores.get(rule.category)!;
      for (const kw of rule.keywords) {
        if (textLower.includes(kw)) {
          entry.score += rule.weight;
          entry.matches.push(kw);
        }
      }
    }

    // Platform-specific adjustments
    const platformLower = platform.toLowerCase();
    if (platformLower === 'whatsapp' || platformLower === 'telegram') {
      const msgEntry = scores.get('messages')!;
      if (textLower.includes('search') || textLower.includes('call') || textLower.includes('typing')) {
        msgEntry.score += 0.8;
      }
    } else if (platformLower === 'google') {
      if (textLower.includes('google account') || textLower.includes('google inc')) {
        scores.get('account_info')!.score += 0.6;
      }
    }

    // Section hint boost
    if (hintSection) {
      const hintLower = hintSection.toLowerCase();
      for (const category of scores.keys()) {
        if (hintLower.includes(category) || (category === 'posts' && hintLower === 'feed')) {
          const entry = scores.get(category)!;
          entry.score += this.manifestHintWeight * 3;
          entry.matches.push(`[hint:${hintSection}]`);
        }
      }
    }

    // Determine category with highest score
    let highestCategory: SectionCategory = 'other';
    let highestScore = 0;
    let matchedKeywords: string[] = [];

    for (const [cat, data] of scores.entries()) {
      if (data.score > highestScore) {
        highestScore = data.score;
        highestCategory = cat;
        matchedKeywords = data.matches;
      }
    }

    // If score is 0 and hintSection exists, fallback to map hintSection if recognized
    if (highestScore === 0) {
      if (hintSection) {
        const mapped = this.mapHintToCategory(hintSection);
        if (mapped) {
          return {
            category: mapped,
            confidence: 0.6,
            matchedKeywords: [`[hint:${hintSection}]`],
            reasoning: `Inferred directly from capture section hint '${hintSection}' (sparse OCR text).`,
          };
        }
      }
      return {
        category: 'other',
        confidence: 0.3,
        matchedKeywords: [],
        reasoning: 'No definitive section keywords or hints identified.',
      };
    }

    // Normalize confidence between 0.65 and 0.98
    const confidence = Math.min(0.98, Math.max(0.65, Number((0.6 + highestScore * 0.1).toFixed(2))));

    return {
      category: highestCategory,
      confidence,
      matchedKeywords,
      reasoning: `Classified as ${highestCategory} based on cues: ${matchedKeywords.join(', ')}.`,
    };
  }

  private mapHintToCategory(hint: string): SectionCategory | null {
    const h = hint.toLowerCase();
    if (h.includes('profile')) return 'profile';
    if (h.includes('feed') || h.includes('post') || h.includes('timeline')) return 'posts';
    if (h.includes('message') || h.includes('chat') || h.includes('dm')) return 'messages';
    if (h.includes('follower')) return 'followers';
    if (h.includes('following')) return 'following';
    if (h.includes('account') || h.includes('info')) return 'account_info';
    if (h.includes('security') || h.includes('password') || h.includes('auth')) return 'security';
    return null;
  }
}
