import { NativeModules, Platform } from 'react-native';

const { ScreenCaptureModule } = NativeModules;

async function callNative<T>(operation: string, call: () => Promise<T>): Promise<T> {
  try { return await call(); }
  catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${operation} failed: ${detail}`);
  }
}

export interface ScreenCaptureInterface {
  requestPermission(): Promise<boolean>;
  captureScreenshot(outputPath?: string): Promise<string>;
  getFilesDir(): Promise<string>;
  stop(): Promise<boolean>;
  isBlankImage(imagePath: string): Promise<boolean>;
}

export const ScreenCapture: ScreenCaptureInterface = {
  requestPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      throw new Error('ScreenCapture is only supported on Android');
    }
    if (!ScreenCaptureModule) {
      throw new Error('ScreenCaptureModule native module is not linked');
    }
    return callNative('Requesting screen capture permission', () => ScreenCaptureModule.requestPermission());
  },

  captureScreenshot: async (outputPath = ''): Promise<string> => {
    if (Platform.OS !== 'android') {
      throw new Error('ScreenCapture is only supported on Android');
    }
    if (!ScreenCaptureModule) {
      throw new Error('ScreenCaptureModule native module is not linked');
    }
    return callNative('Capturing screenshot', () => ScreenCaptureModule.captureScreenshot(outputPath));
  },

  getFilesDir: async (): Promise<string> => {
    if (Platform.OS !== 'android') {
      return '';
    }
    if (!ScreenCaptureModule) {
      return '';
    }
    return callNative('Reading screen capture files directory', () => ScreenCaptureModule.getFilesDir());
  },

  stop: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    if (!ScreenCaptureModule) {
      return true;
    }
    return callNative('Stopping screen capture service', () => ScreenCaptureModule.stop());
  },

  isBlankImage: async (imagePath: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !ScreenCaptureModule) return false;
    return callNative('Checking captured image', () => ScreenCaptureModule.isBlankImage(imagePath));
  },
};
