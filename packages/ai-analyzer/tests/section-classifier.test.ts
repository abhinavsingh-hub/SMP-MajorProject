import { describe, expect, it } from 'vitest';
import { SectionClassifier } from '../src/index.js';

describe('SectionClassifier', () => {
  const classifier = new SectionClassifier();

  it('classifies profile screens from OCR keywords and bio cues', () => {
    const text = 'John Doe @johndoe Edit Profile 142 posts 1,200 followers Bio: Cyber enthusiast';
    const result = classifier.classify(text, 'instagram', 'profile');

    expect(result.category).toBe('profile');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.matchedKeywords).toContain('edit profile');
  });

  it('classifies Hindi profile cues', () => {
    const text = 'बायो: तकनीक प्रेमी और अन्वेषक प्रोफ़ाइल विवरण';
    const result = classifier.classify(text, 'instagram');

    expect(result.category).toBe('profile');
    expect(result.matchedKeywords).toContain('बायो');
  });

  it('classifies messages/chat screens for WhatsApp and Telegram', () => {
    const text = 'Chats 12 Unread Type a message... Online Last seen today at 10:45 AM';
    const result = classifier.classify(text, 'whatsapp');

    expect(result.category).toBe('messages');
    expect(result.matchedKeywords).toContain('chats');
  });

  it('classifies followers and following lists', () => {
    const followersText = 'Followers 540 people Followed by @target_user';
    const followersRes = classifier.classify(followersText, 'x');
    expect(followersRes.category).toBe('followers');

    const followingText = 'Following 120 accounts Mutual subscriptions Unfollow';
    const followingRes = classifier.classify(followingText, 'x');
    expect(followingRes.category).toBe('following');
  });

  it('classifies account_info screens', () => {
    const text = 'Manage your Google Account Personal details Birthday: 1990-05-12 Phone Number: +919876543210';
    const result = classifier.classify(text, 'google');

    expect(result.category).toBe('account_info');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('classifies security and authentication screens', () => {
    const text = 'Security settings 2-Step Verification Active sessions Passkey Authenticator';
    const result = classifier.classify(text, 'google');

    expect(result.category).toBe('security');
    expect(result.matchedKeywords).toContain('security settings');
  });

  it('falls back to section hint when OCR text is empty', () => {
    const result = classifier.classify('', 'instagram', 'feed');
    expect(result.category).toBe('posts');
    expect(result.matchedKeywords).toContain('[hint:feed]');
  });

  it('returns other when no text or hints match', () => {
    const result = classifier.classify('completely random unrelated text', 'unknown', 'misc');
    expect(result.category).toBe('other');
  });
});
