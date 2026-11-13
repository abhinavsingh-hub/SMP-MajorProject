import { ScriptRunner } from '../src/runner/ScriptRunner';
import type { Step } from '../src/runner/types';
import { Accessibility } from '../src/native/Accessibility';
import { ScreenCapture } from '../src/native/ScreenCapture';

// Mock the native wrappers
jest.mock('../src/native/Accessibility', () => ({
  Accessibility: {
    launchApp: jest.fn(),
    waitForText: jest.fn(),
    clickByText: jest.fn(),
    clickByViewId: jest.fn(),
    scrollForward: jest.fn(),
    performBack: jest.fn(),
    performHome: jest.fn(),
    getForegroundPackage: jest.fn(),
  },
}));

jest.mock('../src/native/ScreenCapture', () => ({
  ScreenCapture: {
    captureScreenshot: jest.fn(),
    isBlankImage: jest.fn(),
  },
}));

describe('ScriptRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Executes a successful run with all events emitted', async () => {
    (Accessibility.launchApp as jest.Mock).mockResolvedValue(true);
    (Accessibility.waitForText as jest.Mock).mockResolvedValue(true);
    (ScreenCapture.captureScreenshot as jest.Mock).mockResolvedValue(
      '/data/user/0/com.socialparse.mobile/files/CASE-01/telegram/screenshots/0001_feed.png',
    );

    const onCaptureMock = jest.fn();
    const runner = new ScriptRunner({
      caseDir: '/data/user/0/com.socialparse.mobile/files/CASE-01',
      platform: 'telegram',
      onCapture: onCaptureMock,
    });

    const stepStartListener = jest.fn();
    const stepSuccessListener = jest.fn();
    const captureListener = jest.fn();
    const doneListener = jest.fn();

    runner.on('stepStart', stepStartListener);
    runner.on('stepSuccess', stepSuccessListener);
    runner.on('capture', captureListener);
    runner.on('done', doneListener);

    const steps: Step[] = [
      { kind: 'launchApp', packageName: 'org.telegram.messenger', label: 'Launch Telegram' },
      { kind: 'waitForText', text: 'Chats', label: 'Wait for Chats' },
      { kind: 'capture', section: 'feed', source: 'telegram_main', label: 'Capture Feed' },
    ];

    const result = await runner.run(steps);

    expect(result).toBe(true);
    expect(stepStartListener).toHaveBeenCalledTimes(3);
    expect(stepSuccessListener).toHaveBeenCalledTimes(3);
    expect(captureListener).toHaveBeenCalledWith(
      'feed',
      '/data/user/0/com.socialparse.mobile/files/CASE-01/telegram/screenshots/0001_feed.png',
      'telegram_main',
    );
    expect(onCaptureMock).toHaveBeenCalledTimes(1);
    expect(doneListener).toHaveBeenCalledTimes(1);

    const logs = runner.getLog();
    expect(logs.some((l) => l.event === 'done')).toBe(true);
  });

  test('2. Skips an optional step failure and continues the run', async () => {
    (Accessibility.launchApp as jest.Mock).mockResolvedValue(true);
    // Optional step fails
    (Accessibility.clickByText as jest.Mock).mockResolvedValue(false);
    (Accessibility.performBack as jest.Mock).mockResolvedValue(true);

    const runner = new ScriptRunner({
      caseDir: '/tmp/case',
      platform: 'whatsapp',
    });

    const stepFailedListener = jest.fn();
    const doneListener = jest.fn();

    runner.on('stepFailed', stepFailedListener);
    runner.on('done', doneListener);

    const steps: Step[] = [
      { kind: 'launchApp', packageName: 'com.whatsapp' },
      { kind: 'clickByText', text: 'Dismiss Dialog', optional: true, label: 'Optional Dialog' },
      { kind: 'back', label: 'Back Step' },
    ];

    const result = await runner.run(steps);

    expect(result).toBe(true);
    expect(stepFailedListener).toHaveBeenCalledTimes(1);
    expect(Accessibility.performBack).toHaveBeenCalledTimes(1);
    expect(doneListener).toHaveBeenCalledTimes(1);

    const logs = runner.getLog();
    expect(logs.some((l) => l.event === 'stepSkipped')).toBe(true);
  });

  test('3. Retries a failed step and succeeds on subsequent attempt', async () => {
    // Fails on attempt 1, succeeds on attempt 2
    (Accessibility.waitForText as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const runner = new ScriptRunner({
      caseDir: '/tmp/case',
      platform: 'instagram',
      retryDelayMs: 10,
    });

    const stepSuccessListener = jest.fn();
    runner.on('stepSuccess', stepSuccessListener);

    const steps: Step[] = [
      { kind: 'waitForText', text: 'Stories', retries: 2, label: 'Wait Stories' },
    ];

    const result = await runner.run(steps);

    expect(result).toBe(true);
    expect(Accessibility.waitForText).toHaveBeenCalledTimes(2);
    expect(stepSuccessListener).toHaveBeenCalledTimes(1);

    const logs = runner.getLog();
    expect(logs.some((l) => l.event === 'stepAttemptFailed')).toBe(true);
    expect(logs.some((l) => l.event === 'stepSuccess')).toBe(true);
  });

  test('4. Stops execution mid-run when stop() is called', async () => {
    (Accessibility.launchApp as jest.Mock).mockResolvedValue(true);
    (Accessibility.scrollForward as jest.Mock).mockResolvedValue(true);

    const runner = new ScriptRunner({
      caseDir: '/tmp/case',
      platform: 'facebook',
    });

    const stoppedListener = jest.fn();
    runner.on('stopped', stoppedListener);

    runner.on('stepStart', (_step, index) => {
      // Trigger stop on step index 0
      if (index === 0) {
        runner.stop();
      }
    });

    const steps: Step[] = [
      { kind: 'launchApp', packageName: 'com.facebook.katana' },
      { kind: 'scroll', times: 1 },
      { kind: 'scroll', times: 1 },
    ];

    const result = await runner.run(steps);

    expect(result).toBe(false);
    expect(stoppedListener).toHaveBeenCalledTimes(1);
    // Subsequent scroll steps should never have been executed
    expect(Accessibility.scrollForward).not.toHaveBeenCalled();

    const logs = runner.getLog();
    expect(logs.some((l) => l.event === 'stopped')).toBe(true);
  });

  test('emits blocked capture and records a WARNING while keeping the evidence file', async () => {
    const path = '/tmp/case/whatsapp/screenshots/0001_chat.png';
    (ScreenCapture.captureScreenshot as jest.Mock).mockResolvedValue(path);
    (ScreenCapture.isBlankImage as jest.Mock).mockResolvedValue(true);
    const onCapture = jest.fn();
    const runner = new ScriptRunner({ caseDir: '/tmp/case', platform: 'whatsapp', onCapture });
    const blockedListener = jest.fn();

    runner.on('captureBlocked', blockedListener);
    expect(await runner.run([{ kind: 'capture', section: 'chat_1', source: 'whatsapp' }])).toBe(true);

    expect(blockedListener).toHaveBeenCalledWith('chat_1', path);
    expect(onCapture).toHaveBeenCalledWith(path, 'chat_1', 'whatsapp', expect.any(String));
    expect(runner.getBlockedCount()).toBe(1);
    expect(runner.getLog()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'WARNING',
          details: expect.objectContaining({
            warning: 'screen may be protected by FLAG_SECURE: chat_1',
            filePath: path,
            blockedCaptureCount: 1,
          }),
        }),
      ]),
    );
  });

  test('resume skips completed steps and continues the screenshot sequence', async () => {
    (Accessibility.launchApp as jest.Mock).mockResolvedValue(true);
    (ScreenCapture.captureScreenshot as jest.Mock).mockImplementation(async (path: string) => path);
    (ScreenCapture.isBlankImage as jest.Mock).mockResolvedValue(false);
    const onCaptureProgress = jest.fn();
    const runner = new ScriptRunner({ caseDir: '/tmp/case', platform: 'telegram', onCaptureProgress });
    const steps: Step[] = [
      { kind: 'launchApp', packageName: 'org.telegram.messenger' },
      { kind: 'capture', section: 'messages' },
      { kind: 'back' },
    ];

    expect(await runner.run(steps, { startIndex: 1, captureCounter: 14 })).toBe(true);
    expect(Accessibility.launchApp).not.toHaveBeenCalled();
    expect(ScreenCapture.captureScreenshot).toHaveBeenCalledWith(expect.stringContaining('_0014_'));
    expect(onCaptureProgress).toHaveBeenCalledWith(1, 15);
    expect(runner.getCaptureCounter()).toBe(15);
  });
});
