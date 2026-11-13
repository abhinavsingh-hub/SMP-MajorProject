import { buildInstagramScript } from '../src/scripts/instagram/instagramScript';
import { INSTAGRAM_LABELS } from '../src/scripts/instagram/labels';
import { buildFacebookScript } from '../src/scripts/facebook/facebookScript';
import { FACEBOOK_LABELS } from '../src/scripts/facebook/labels';
import { getScriptForPlatform, isPlatformSupported } from '../src/scripts';
import type { Step } from '../src/runner/types';

const expectLabelStepsOptional = (steps: Step[]) => {
  const labelSteps = steps.filter((step) => ['waitForText', 'clickByText', 'clickByViewId'].includes(step.kind));
  expect(labelSteps.length).toBeGreaterThan(0);
  for (const step of labelSteps) expect(step).toMatchObject({ optional: true, retries: 1 });
};

describe('Instagram capture script', () => {
  const steps = buildInstagramScript({ maxPosts: 2, scrollsPerSection: 1 });

  test('orders profile, lists, posts, inbox, settings and fallback captures', () => {
    expect(steps[0]).toMatchObject({ kind: 'launchApp', packageName: INSTAGRAM_LABELS.PACKAGE_NAME });
    const captureIndex = (section: string) => steps.findIndex((step) => step.kind === 'capture' && step.section === section);
    expect(captureIndex('profile_header')).toBeLessThan(captureIndex('followers_initial'));
    expect(captureIndex('followers_initial')).toBeLessThan(captureIndex('following_initial'));
    expect(captureIndex('following_initial')).toBeLessThan(captureIndex('profile_grid_scroll_1'));
    expect(captureIndex('profile_grid_scroll_1')).toBeLessThan(captureIndex('post_1'));
    expect(captureIndex('post_1')).toBeLessThan(captureIndex('post_2'));
    expect(captureIndex('post_2')).toBeLessThan(captureIndex('messages_inbox'));
    expect(captureIndex('messages_inbox')).toBeLessThan(captureIndex('settings'));
    expect(captureIndex('settings')).toBeLessThan(captureIndex('fallback_initial'));
    expect(steps.filter((step) => step.kind === 'capture' && step.section.startsWith('followers_scroll_'))).toHaveLength(1);
    expect(steps.filter((step) => step.kind === 'capture' && step.section.startsWith('following_scroll_'))).toHaveLength(1);
    expectLabelStepsOptional(steps);
  });

  test('registers Instagram for CaptureScreen registry lookup', () => {
    expect(isPlatformSupported('instagram')).toBe(true);
    expect(getScriptForPlatform('instagram', { maxPosts: 1, scrollsPerSection: 1 })[0]).toMatchObject({
      kind: 'launchApp', packageName: INSTAGRAM_LABELS.PACKAGE_NAME,
    });
  });
});

describe('Facebook capture script', () => {
  const steps = buildFacebookScript({ maxPosts: 2, scrollsPerSection: 1 });

  test('orders profile, About, Friends, timeline posts, Photos, inbox and fallback', () => {
    expect(steps[0]).toMatchObject({ kind: 'launchApp', packageName: FACEBOOK_LABELS.PACKAGE_NAME });
    const captureIndex = (section: string) => steps.findIndex((step) => step.kind === 'capture' && step.section === section);
    expect(captureIndex('profile')).toBeLessThan(captureIndex('about_info'));
    expect(captureIndex('about_info')).toBeLessThan(captureIndex('friends_initial'));
    expect(captureIndex('friends_initial')).toBeLessThan(captureIndex('friends_scroll_1'));
    expect(captureIndex('friends_scroll_1')).toBeLessThan(captureIndex('timeline_scroll_1'));
    expect(captureIndex('timeline_scroll_1')).toBeLessThan(captureIndex('timeline_post_1'));
    expect(captureIndex('timeline_post_1')).toBeLessThan(captureIndex('timeline_post_2'));
    expect(captureIndex('timeline_post_2')).toBeLessThan(captureIndex('photos_tab'));
    expect(captureIndex('photos_tab')).toBeLessThan(captureIndex('messages_inbox'));
    expect(captureIndex('messages_inbox')).toBeLessThan(captureIndex('fallback_initial'));
    expectLabelStepsOptional(steps);
  });

  test('registers Facebook for CaptureScreen registry lookup', () => {
    expect(isPlatformSupported('facebook')).toBe(true);
    expect(getScriptForPlatform('facebook', { maxPosts: 1, scrollsPerSection: 1 })[0]).toMatchObject({
      kind: 'launchApp', packageName: FACEBOOK_LABELS.PACKAGE_NAME,
    });
  });
});
