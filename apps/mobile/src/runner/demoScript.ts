import type { Step } from './types';

/**
 * Forensic capture demonstration script:
 * 1. Launches Android Settings
 * 2. Waits for 'Network'
 * 3. Captures screen (section: 'settings_top')
 * 4. Scrolls forward twice
 * 5. Captures screen (section: 'settings_scrolled')
 * 6. Performs Back navigation
 */
export const demoScript: Step[] = [
  {
    kind: 'launchApp',
    packageName: 'com.android.settings',
    label: 'Launch Android Settings',
  },
  {
    kind: 'waitForText',
    text: 'Network',
    timeoutMs: 5000,
    label: "Wait for 'Network' text",
  },
  {
    kind: 'capture',
    section: 'settings_top',
    source: 'system',
    label: 'Capture initial settings view',
  },
  {
    kind: 'scroll',
    times: 2,
    delayMs: 400,
    label: 'Scroll down settings twice',
  },
  {
    kind: 'capture',
    section: 'settings_scrolled',
    source: 'system',
    label: 'Capture scrolled settings view',
  },
  {
    kind: 'back',
    label: 'Return to SocialParse',
  },
];
