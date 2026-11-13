import { useEffect, useState } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { AccessibilityBridgeModule } = NativeModules;
const accessibilityEmitter = AccessibilityBridgeModule
  ? new NativeEventEmitter(AccessibilityBridgeModule)
  : null;

export interface AccessibilityInterface {
  isEnabled(): Promise<boolean>;
  openSettings(): Promise<boolean>;
}

export const Accessibility: AccessibilityInterface = {
  isEnabled: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }
    if (!AccessibilityBridgeModule) {
      return false;
    }
    return AccessibilityBridgeModule.isEnabled();
  },

  openSettings: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }
    if (!AccessibilityBridgeModule) {
      return false;
    }
    return AccessibilityBridgeModule.openSettings();
  },
};

/**
 * Custom React hook to observe the current active status of CaptureAccessibilityService.
 * Listens for native 'accessibilityStatus' events and refreshes on AppState foregrounding.
 */
export function useAccessibilityStatus(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial status query
    Accessibility.isEnabled().then((status) => {
      if (isMounted) {
        setIsEnabled(status);
      }
    });

    // 2. Listen for native service connection/disconnection events
    const subscription = accessibilityEmitter?.addListener(
      'accessibilityStatus',
      (event: { enabled: boolean }) => {
        if (isMounted) {
          setIsEnabled(Boolean(event.enabled));
        }
      },
    );

    // 3. Re-check when app returns to foreground from system settings
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        Accessibility.isEnabled().then((status) => {
          if (isMounted) {
            setIsEnabled(status);
          }
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
