import { useEffect, useState } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { AccessibilityBridgeModule } = NativeModules;
const accessibilityEmitter = AccessibilityBridgeModule
  ? new NativeEventEmitter(AccessibilityBridgeModule)
  : null;

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
    return AccessibilityBridgeModule.isEnabled();
  },

  openSettings: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.openSettings();
  },

  clickByText: async (text: string, exact = false): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.clickByText(text, exact);
  },

  clickByViewId: async (id: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.clickByViewId(id);
  },

  waitForText: async (text: string, timeoutMs = 5000): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.waitForText(text, timeoutMs);
  },

  scrollForward: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.scrollForward();
  },

  performBack: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.performBack();
  },

  performHome: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.performHome();
  },

  getForegroundPackage: async (): Promise<string> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return '';
    return AccessibilityBridgeModule.getForegroundPackage();
  },

  launchApp: async (packageName: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityBridgeModule) return false;
    return AccessibilityBridgeModule.launchApp(packageName);
  },
};

/**
 * Custom React hook to observe active status of CaptureAccessibilityService.
 */
export function useAccessibilityStatus(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Accessibility.isEnabled().then((status) => {
      if (isMounted) setIsEnabled(status);
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
        });
      }
    });

    return () => {
      isMounted = false;
      subscription?.remove();
      appStateSub.remove();
    };
  }, []);

  return isEnabled;
}
