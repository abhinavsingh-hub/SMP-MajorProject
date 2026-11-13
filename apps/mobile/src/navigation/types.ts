import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CaptureRunState } from '../evidence/runState';

export type RootStackParamList = {
  Home: undefined;
  CaseInfo: {
    platform: string;
  };
  Capture: {
    platform: string;
    caseNumber: string;
    examinerName: string;
    accusedName: string;
    caseDir: string;
    resumeState?: CaptureRunState;
  };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type CaseInfoScreenProps = NativeStackScreenProps<RootStackParamList, 'CaseInfo'>;
export type CaptureScreenProps = NativeStackScreenProps<RootStackParamList, 'Capture'>;
