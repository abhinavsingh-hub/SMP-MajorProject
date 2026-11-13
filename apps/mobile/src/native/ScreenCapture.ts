import { NativeModules, Platform } from 'react-native';

const { ScreenCaptureModule } = NativeModules;

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
    return ScreenCaptureModule.requestPermission();
  },

  captureScreenshot: async (outputPath = ''): Promise<string> => {
    if (Platform.OS !== 'android') {
      throw new Error('ScreenCapture is only supported on Android');
    }
    if (!ScreenCaptureModule) {
      throw new Error('ScreenCaptureModule native module is not linked');
    }
    return ScreenCaptureModule.captureScreenshot(outputPath);
  },

  getFilesDir: async (): Promise<string> => {
    if (Platform.OS !== 'android') {
      return '';
    }
    if (!ScreenCaptureModule) {
      return '';
    }
    return ScreenCaptureModule.getFilesDir();
  },

  stop: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    if (!ScreenCaptureModule) {
      return true;
    }
    return ScreenCaptureModule.stop();
  },

  isBlankImage: async (imagePath: string): Promise<boolean> => {
    if (Platform.OS !== 'android' || !ScreenCaptureModule) return false;
    return ScreenCaptureModule.isBlankImage(imagePath);
  },
};
