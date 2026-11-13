import { buildTelegramScript } from '../src/scripts/telegram/telegramScript';
import { TELEGRAM_LABELS } from '../src/scripts/telegram/labels';
import { getScriptForPlatform, isPlatformSupported } from '../src/scripts';

describe('Telegram Script Builder', () => {
  const options = { maxChats: 2, scrollsPerSection: 1 };
  const steps = buildTelegramScript(options);

  test('1. Returns steps in the required forensic sequence', () => {
    expect(steps.length).toBeGreaterThan(10);

    // Step 0: launchApp
    expect(steps[0]).toMatchObject({
      kind: 'launchApp',
      packageName: TELEGRAM_LABELS.PACKAGE_NAME,
    });

    // Step 1: waitForText
    expect(steps[1]).toMatchObject({
      kind: 'waitForText',
      text: TELEGRAM_LABELS.HEADER_TITLE,
    });

    // Step 2: Initial chat list capture
    expect(steps[2]).toMatchObject({
      kind: 'capture',
      section: 'chat_list_main',
      source: 'telegram',
    });

    // Find account info capture
    const accountCaptureIndex = steps.findIndex(
      (s) => s.kind === 'capture' && s.section === 'account_info',
    );
    expect(accountCaptureIndex).toBeGreaterThan(2);

    // Find contacts capture
    const contactsCaptureIndex = steps.findIndex(
      (s) => s.kind === 'capture' && s.section === 'contacts_page_1',
    );
    expect(contactsCaptureIndex).toBeGreaterThan(accountCaptureIndex);

    // Find chat 1 and chat 2 captures
    const chat1Index = steps.findIndex(
      (s) => s.kind === 'capture' && s.section === 'chat_1_initial',
    );
    const chat2Index = steps.findIndex(
      (s) => s.kind === 'capture' && s.section === 'chat_2_initial',
    );
    expect(chat1Index).toBeGreaterThan(contactsCaptureIndex);
    expect(chat2Index).toBeGreaterThan(chat1Index);

    // Find group and channel folder captures
    const groupFolderIndex = steps.findIndex(
      (s) => s.kind === 'capture' && s.section === 'folder_groups',
    );
    const channelFolderIndex = steps.findIndex(
      (s) => s.kind === 'capture' && s.section === 'folder_channels',
    );
    expect(groupFolderIndex).toBeGreaterThan(chat2Index);
    expect(channelFolderIndex).toBeGreaterThan(groupFolderIndex);
  });

  test('2. Ensures EVERY label-dependent step is marked optional with 1 retry', () => {
    const labelDependentKinds = ['waitForText', 'clickByText', 'clickByViewId'];

    const labelSteps = steps.filter((s) => labelDependentKinds.includes(s.kind));
    expect(labelSteps.length).toBeGreaterThan(0);

    for (const step of labelSteps) {
      expect(step.optional).toBe(true);
      expect(step.retries).toBe(1);
    }
  });

  test('3. Resolves correctly through platform script registry', () => {
    expect(isPlatformSupported('telegram')).toBe(true);
    expect(isPlatformSupported('Telegram')).toBe(true);
    expect(isPlatformSupported('unknown_app')).toBe(false);

    const registeredSteps = getScriptForPlatform('telegram', { maxChats: 1, scrollsPerSection: 1 });
    expect(registeredSteps[0].kind).toBe('launchApp');
  });
});
