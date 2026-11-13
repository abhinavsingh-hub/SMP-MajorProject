import { useEffect, useState } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { AccessibilityBridgeModule } = NativeModules;
const accessibilityEmitter = AccessibilityBridgeModule
  ? new NativeEventEmitter(AccessibilityBridgeModule)
  : null;

async function callNative<T>(operation: string, call: () => Promise<T>): Promise<T> {
  try { return await call(); }
  catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${operation} failed: ${detail}`);
  }
}

export interface AccessibilityInterface {
  isEnabled(): Promise<boolean>;
  openSettings(): Promise<boolean>;
  clickByText(text: string, exact?: boolean): Promise<boolean>;
  clickByViewId(id: string): Promise<boolean>;
  waitForText(text: string, timeoutMs?: number): Promise<boolean>;
  scrollForward(): Promise<boolean>;
  performBack(): Promise<boolean>;
  performHome(): Promise<boolean>;
  getForegroundPackage(): Promise<string>;
  launchApp(packageName: string): Promise<boolean>;
}

export const Accessibility: AccessibilityInterface = {
  isEnabled: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative('Checking accessibility service', () => AccessibilityBridgeModule.isEnabled());
  },

  openSettings: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative('Opening accessibility settings', () => AccessibilityBridgeModule.openSettings());
  },

  clickByText: async (text: string, exact = false): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative(`Clicking text ${text}`, () => AccessibilityBridgeModule.clickByText(text, exact));
  },

  clickByViewId: async (id: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative(`Clicking view ${id}`, () => AccessibilityBridgeModule.clickByViewId(id));
  },

  waitForText: async (text: string, timeoutMs = 5000): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative(`Waiting for text ${text}`, () => AccessibilityBridgeModule.waitForText(text, timeoutMs));
  },

  scrollForward: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative('Scrolling forward', () => AccessibilityBridgeModule.scrollForward());
  },

  performBack: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative('Performing BACK action', () => AccessibilityBridgeModule.performBack());
  },

  performHome: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative('Performing HOME action', () => AccessibilityBridgeModule.performHome());
  },

  getForegroundPackage: async (): Promise<string> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return '';
    return callNative('Reading foreground package', () => AccessibilityBridgeModule.getForegroundPackage());
  },

  launchApp: async (packageName: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return callNative(`Launching ${packageName}`, () => AccessibilityBridgeModule.launchApp(packageName));
  },
};

/**
 * Custom React hook to observe active status of CaptureAccessibilityService.
 */
export function useAccessibilityStatus(onError?: (error: Error) => void): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Accessibility.isEnabled().then((status) => {
      if (isMounted) setIsEnabled(status);
    }).catch((error: unknown) => {
      if (isMounted) setIsEnabled(false);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    });

    const subscription = accessibilityEmitter?.addListener(
      'accessibilityStatus',
      (event: { enabled: boolean }) => {
        if (isMounted) setIsEnabled(Boolean(event.enabled));
      },
    );

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        Accessibility.isEnabled().then((status) => {
          if (isMounted) setIsEnabled(status);
        }).catch((error: unknown) => {
          if (isMounted) setIsEnabled(false);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        });
      }
    });

    return () => {
      isMounted = false;
      subscription?.remove();
      appStateSub.remove();
    };
  }, [onError]);

  return isEnabled;
}
