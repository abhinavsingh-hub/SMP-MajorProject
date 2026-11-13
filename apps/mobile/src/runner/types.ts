export type StepKind =
  | 'launchApp'
  | 'waitForText'
  | 'clickByText'
  | 'clickByViewId'
  | 'scroll'
  | 'back'
  | 'home'
  | 'delay'
  | 'capture';

export interface BaseStep {
  label?: string;
  optional?: boolean;
  retries?: number;
}

export interface LaunchAppStep extends BaseStep {
  kind: 'launchApp';
  packageName: string;
}

export interface WaitForTextStep extends BaseStep {
  kind: 'waitForText';
  text: string;
  timeoutMs?: number;
}

export interface ClickByTextStep extends BaseStep {
  kind: 'clickByText';
  text: string;
  exact?: boolean;
}

export interface ClickByViewIdStep extends BaseStep {
  kind: 'clickByViewId';
  id: string;
}

export interface ScrollStep extends BaseStep {
  kind: 'scroll';
  times?: number;
  delayMs?: number;
}

export interface BackStep extends BaseStep {
  kind: 'back';
}

export interface HomeStep extends BaseStep {
  kind: 'home';
}

export interface DelayStep extends BaseStep {
  kind: 'delay';
  ms: number;
}

export interface CaptureStep extends BaseStep {
  kind: 'capture';
  section: string;
  source?: string;
}

export type Step =
  | LaunchAppStep
  | WaitForTextStep
  | ClickByTextStep
  | ClickByViewIdStep
  | ScrollStep
  | BackStep
  | HomeStep
  | DelayStep
  | CaptureStep;

export interface LogEntry {
  timestamp: string; // ISO UTC format
  event: string;
  label?: string;
  details?: Record<string, unknown> | string;
}

export type RunnerEvents = {
  stepStart: (step: Step, index: number) => void;
  stepSuccess: (step: Step, index: number, result?: unknown) => void;
  stepFailed: (step: Step, index: number, error: Error) => void;
  capture: (section: string, filePath: string, source?: string) => void;
  captureBlocked: (section: string, filePath: string) => void;
  progress: (index: number, total: number) => void;
  paused: () => void;
  resumed: () => void;
  stopped: () => void;
  done: () => void;
  error: (error: Error) => void;
};

export interface ScriptRunnerConfig {
  caseDir: string;
  platform: string;
  onCapture?: (path: string, section: string, source?: string, capturedAt?: string) => Promise<void> | void;
  onCaptureBlocked?: (path: string, section: string) => Promise<void> | void;
  defaultTimeoutMs?: number;
  retryDelayMs?: number;
}
