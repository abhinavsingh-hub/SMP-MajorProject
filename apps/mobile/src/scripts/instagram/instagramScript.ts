import type { Step } from '../../runner/types';
import { buildFallbackSteps } from '../fallback';
import { INSTAGRAM_LABELS } from './labels';

export interface InstagramScriptOptions {
  maxPosts: number;
  scrollsPerSection: number;
}

const interaction = <T extends Step>(step: T): T => ({ ...step, optional: true, retries: 1 });

export function buildInstagramScript({ maxPosts, scrollsPerSection }: InstagramScriptOptions): Step[] {
  const steps: Step[] = [
    { kind: 'launchApp', packageName: INSTAGRAM_LABELS.PACKAGE_NAME, label: 'Launch Instagram' },
    interaction({ kind: 'waitForText', text: INSTAGRAM_LABELS.TAB_PROFILE, timeoutMs: 8000, label: 'Wait for Instagram home' }),
    interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.TAB_PROFILE, label: 'Open Profile tab' }),
    { kind: 'delay', ms: 500 },
    { kind: 'capture', section: 'profile_header', source: 'instagram', label: 'Capture profile bio and counts' },
    interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.PROFILE_FOLLOWERS, label: 'Open Followers list' }),
    { kind: 'delay', ms: 400 },
    { kind: 'capture', section: 'followers_initial', source: 'instagram', label: 'Capture Followers list' },
  ];

  for (let i = 1; i <= scrollsPerSection; i++) {
    steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Scroll Followers (${i}/${scrollsPerSection})` });
    steps.push({ kind: 'capture', section: `followers_scroll_${i}`, source: 'instagram', label: `Capture Followers page ${i}` });
  }
  steps.push({ kind: 'back', label: 'Return to Profile from Followers' });
  steps.push(interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.PROFILE_FOLLOWING, label: 'Open Following list' }));
  steps.push({ kind: 'delay', ms: 400 }, { kind: 'capture', section: 'following_initial', source: 'instagram', label: 'Capture Following list' });
  for (let i = 1; i <= scrollsPerSection; i++) {
    steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Scroll Following (${i}/${scrollsPerSection})` });
    steps.push({ kind: 'capture', section: `following_scroll_${i}`, source: 'instagram', label: `Capture Following page ${i}` });
  }
  steps.push({ kind: 'back', label: 'Return to Profile from Following' });

  for (let i = 1; i <= scrollsPerSection; i++) {
    steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Scroll profile grid (${i}/${scrollsPerSection})` });
    steps.push({ kind: 'capture', section: `profile_grid_scroll_${i}`, source: 'instagram', label: `Capture profile grid page ${i}` });
  }
  for (let i = 1; i <= maxPosts; i++) {
    steps.push(interaction({ kind: 'clickByViewId', id: INSTAGRAM_LABELS.ID_POST_CELL, label: `Open profile post #${i}` }));
    steps.push({ kind: 'delay', ms: 500 }, { kind: 'capture', section: `post_${i}`, source: 'instagram', label: `Capture profile post #${i}` });
    steps.push({ kind: 'back', label: `Return from profile post #${i}` });
    if (i < maxPosts) steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Advance to profile post #${i + 1}` });
  }

  steps.push(interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.TAB_MESSAGES, label: 'Open Messages inbox' }));
  steps.push({ kind: 'delay', ms: 500 }, { kind: 'capture', section: 'messages_inbox', source: 'instagram', label: 'Capture Messages inbox' });
  for (let i = 1; i <= scrollsPerSection; i++) {
    steps.push({ kind: 'scroll', times: 1, delayMs: 400, label: `Scroll inbox (${i}/${scrollsPerSection})` });
    steps.push({ kind: 'capture', section: `messages_inbox_scroll_${i}`, source: 'instagram', label: `Capture inbox page ${i}` });
  }

  steps.push(interaction({ kind: 'clickByViewId', id: INSTAGRAM_LABELS.ID_PROFILE_MENU, label: 'Open profile settings' }));
  steps.push(interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.MENU_SETTINGS, label: 'Open Settings and privacy' }));
  steps.push({ kind: 'capture', section: 'settings', source: 'instagram', optional: true, label: 'Capture Settings and privacy' });
  steps.push(interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.SETTINGS_YOUR_ACTIVITY, label: 'Open Your activity' }));
  steps.push({ kind: 'capture', section: 'your_activity', source: 'instagram', optional: true, label: 'Capture Your activity' });
  steps.push(interaction({ kind: 'clickByText', text: INSTAGRAM_LABELS.SETTINGS_ACCOUNT_INFO, label: 'Open Account info' }));
  steps.push({ kind: 'capture', section: 'account_info', source: 'instagram', optional: true, label: 'Capture Account info' });

  // Step[] has no conditional branching; this final best-effort pass also
  // guarantees evidence when the profile tab selector was unavailable.
  steps.push(...buildFallbackSteps('instagram', scrollsPerSection));
  return steps;
}
