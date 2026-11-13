import type { Step } from '../../runner/types';
import { buildFallbackSteps } from '../fallback';
import { FACEBOOK_LABELS } from './labels';

export interface FacebookScriptOptions {
  maxPosts: number;
  scrollsPerSection: number;
}

const interaction = <T extends Step>(step: T): T => ({ ...step, optional: true, retries: 1 });

export function buildFacebookScript({ maxPosts, scrollsPerSection }: FacebookScriptOptions): Step[] {
  const steps: Step[] = [
    { kind: 'launchApp', packageName: FACEBOOK_LABELS.PACKAGE_NAME, label: 'Launch Facebook' },
    interaction({ kind: 'waitForText', text: FACEBOOK_LABELS.TAB_PROFILE, timeoutMs: 8000, label: 'Wait for Facebook home' }),
    interaction({ kind: 'clickByText', text: FACEBOOK_LABELS.TAB_PROFILE, label: 'Open Profile' }),
    { kind: 'delay', ms: 500 },
    { kind: 'capture', section: 'profile', source: 'facebook', label: 'Capture Facebook profile' },
    interaction({ kind: 'clickByText', text: FACEBOOK_LABELS.PROFILE_ABOUT, label: 'Open About information' }),
    { kind: 'capture', section: 'about_info', source: 'facebook', optional: true, label: 'Capture About information' },
    interaction({ kind: 'clickByText', text: FACEBOOK_LABELS.PROFILE_INTRO, label: 'Open Intro information' }),
    { kind: 'capture', section: 'intro_info', source: 'facebook', optional: true, label: 'Capture Intro information' },
    { kind: 'back', label: 'Return to Profile from About' },
    interaction({ kind: 'clickByText', text: FACEBOOK_LABELS.PROFILE_FRIENDS, label: 'Open Friends list' }),
    { kind: 'delay', ms: 400 },
    { kind: 'capture', section: 'friends_initial', source: 'facebook', label: 'Capture Friends list' },
  ];

  for (let i = 1; i <= scrollsPerSection; i++) {
    steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Scroll Friends (${i}/${scrollsPerSection})` });
    steps.push({ kind: 'capture', section: `friends_scroll_${i}`, source: 'facebook', label: `Capture Friends page ${i}` });
  }
  steps.push({ kind: 'back', label: 'Return to Profile from Friends' });
  for (let i = 1; i <= scrollsPerSection; i++) {
    steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Scroll timeline (${i}/${scrollsPerSection})` });
    steps.push({ kind: 'capture', section: `timeline_scroll_${i}`, source: 'facebook', label: `Capture timeline page ${i}` });
  }
  for (let i = 1; i <= maxPosts; i++) {
    steps.push(interaction({ kind: 'clickByViewId', id: FACEBOOK_LABELS.ID_POST_CARD, label: `Open timeline post #${i}` }));
    steps.push({ kind: 'capture', section: `timeline_post_${i}`, source: 'facebook', label: `Capture timeline post #${i}` });
    steps.push({ kind: 'back', label: `Return from timeline post #${i}` });
    if (i < maxPosts) steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Advance to timeline post #${i + 1}` });
  }
  steps.push(interaction({ kind: 'clickByText', text: FACEBOOK_LABELS.TAB_PHOTOS, label: 'Open Photos tab' }));
  steps.push({ kind: 'capture', section: 'photos_tab', source: 'facebook', optional: true, label: 'Capture Photos tab' });
  steps.push(interaction({ kind: 'clickByText', text: FACEBOOK_LABELS.TAB_MESSAGES, label: 'Open Messages inbox' }));
  steps.push({ kind: 'capture', section: 'messages_inbox', source: 'facebook', optional: true, label: 'Capture Messenger inbox when available' });

  // Step[] cannot branch on the profile click result, so retain this as a
  // final best-effort evidence pass when the profile selector is inaccessible.
  steps.push(...buildFallbackSteps('facebook', scrollsPerSection));
  return steps;
}
