import { Accessibility } from '../native/Accessibility';
import { ScreenCapture } from '../native/ScreenCapture';
import type { LogEntry, RunnerEvents, ScriptRunOptions, ScriptRunnerConfig, Step } from './types';

export class TypedEventEmitter<Events extends Record<string, (...args: any[]) => void>> {
  private listeners: { [K in keyof Events]?: Array<Events[K]> } = {};

  on<K extends keyof Events>(event: K, listener: Events[K]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Events[K]): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((l) => l !== listener);
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        // Prevent listener errors from stopping runner execution
        console.error(`Error in event listener for ${String(event)}:`, err);
      }
    });
  }
}

export class ScriptRunner extends TypedEventEmitter<RunnerEvents> {
  private config: ScriptRunnerConfig;
  private isPaused = false;
  private isStopped = false;
  private isRunning = false;
  private pauseResolver: (() => void) | null = null;
  private captureCounter = 1;
  private blockedCaptureCount = 0;
  private logs: LogEntry[] = [];

  constructor(config: ScriptRunnerConfig) {
    super();
    this.config = {
      defaultTimeoutMs: 5000,
      retryDelayMs: 400,
      ...config,
    };
  }

  public getLog(): LogEntry[] {
    return [...this.logs];
  }

  public clearLog(): void {
    this.logs = [];
  }

  public getCaptureCounter(): number {
    return this.captureCounter;
  }

  public getBlockedCount(): number {
    return this.blockedCaptureCount;
  }

  public pause(): void {
    if (!this.isRunning || this.isPaused || this.isStopped) return;
    this.isPaused = true;
    this.addLog('paused', undefined, 'Script execution paused');
    this.emit('paused');
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused || this.isStopped) return;
    this.isPaused = false;
    this.addLog('resumed', undefined, 'Script execution resumed');
    this.emit('resumed');
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  public stop(): void {
    if (!this.isRunning || this.isStopped) return;
    this.isStopped = true;
    this.isPaused = false;
    this.addLog('stopped', undefined, 'Script execution stopped by user');
    this.emit('stopped');
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  public async run(steps: Step[], options: ScriptRunOptions = {}): Promise<boolean> {
    this.isRunning = true;
    this.isPaused = false;
    this.isStopped = false;
    this.blockedCaptureCount = 0;
    this.captureCounter = Math.max(1, options.captureCounter ?? 1);

    const startIndex = Math.min(steps.length, Math.max(0, Math.floor(options.startIndex ?? 0)));
    const isResume = options.startIndex !== undefined;
    this.addLog(isResume ? 'runResumed' : 'runStart', undefined, isResume
      ? `Resuming execution at step ${startIndex + 1} of ${steps.length}`
      : `Starting execution of ${steps.length} steps`);

    for (let i = startIndex; i < steps.length; i++) {
      if (this.isStopped) {
        this.isRunning = false;
        return false;
      }

      if (this.isPaused) {
        await new Promise<void>((resolve) => {
          this.pauseResolver = resolve;
        });
      }

      if (this.isStopped) {
        this.isRunning = false;
        return false;
      }

      const step = steps[i];
      const stepIndex = i + 1;
      const stepLabel = step.label ?? `${step.kind} (#${stepIndex})`;

      this.emit('progress', stepIndex, steps.length);
      this.emit('stepStart', step, i);
      this.addLog('stepStart', stepLabel, { kind: step.kind, stepIndex });

      const maxAttempts = 1 + (step.retries ?? 0);
      let stepSuccess = false;
      let lastError: Error = new Error(`Step ${stepIndex} (${step.kind}) failed`);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (this.isStopped) {
          this.isRunning = false;
          return false;
        }

        try {
          if (attempt > 1 && this.config.retryDelayMs) {
            await new Promise((resolve) => setTimeout(resolve, this.config.retryDelayMs));
          }

          const result = await this.executeStep(step);
          stepSuccess = true;

          if (step.kind === 'capture') {
            await this.config.onCaptureProgress?.(i, this.captureCounter);
          }

          this.addLog('stepSuccess', stepLabel, { attempt, result });
          this.emit('stepSuccess', step, i, result);
          break;
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          this.addLog('stepAttemptFailed', stepLabel, {
            attempt,
            maxAttempts,
            error: lastError.message,
          });
        }
      }

      if (!stepSuccess) {
        this.addLog('stepFailed', stepLabel, {
          error: lastError.message,
          optional: Boolean(step.optional),
        });
        this.emit('stepFailed', step, i, lastError);

        if (step.optional) {
          this.addLog('stepSkipped', stepLabel, 'Optional step failed; continuing execution');
          continue;
        } else {
          this.isRunning = false;
          this.addLog('error', stepLabel, lastError.message);
          this.emit('error', lastError);
          return false;
        }
      }
    }

    this.isRunning = false;
    this.addLog('done', undefined, `Successfully completed all ${steps.length} steps`);
    this.emit('done');
    return true;
  }

  private async executeStep(step: Step): Promise<unknown> {
    switch (step.kind) {
      case 'launchApp': {
        const ok = await Accessibility.launchApp(step.packageName);
        if (!ok) {
          throw new Error(`Failed to launch application package: ${step.packageName}`);
        }
        return ok;
      }

      case 'waitForText': {
        const timeout = step.timeoutMs ?? this.config.defaultTimeoutMs ?? 5000;
        const found = await Accessibility.waitForText(step.text, timeout);
        if (!found) {
          throw new Error(`Timed out after ${timeout}ms waiting for text: "${step.text}"`);
        }
        return found;
      }

      case 'clickByText': {
        const ok = await Accessibility.clickByText(step.text, step.exact ?? false);
        if (!ok) {
          throw new Error(`Failed to click element with text: "${step.text}"`);
        }
        return ok;
      }

      case 'clickByViewId': {
        const ok = await Accessibility.clickByViewId(step.id);
        if (!ok) {
          throw new Error(`Failed to click element with viewId: "${step.id}"`);
        }
        return ok;
      }

      case 'scroll': {
        const times = step.times ?? 1;
        const delayMs = step.delayMs ?? 300;
        let lastResult = false;
        for (let t = 0; t < times; t++) {
          if (this.isStopped) return false;
          lastResult = await Accessibility.scrollForward();
          if (delayMs > 0 && t < times - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        return lastResult;
      }

      case 'back': {
        const ok = await Accessibility.performBack();
        if (!ok) {
          throw new Error('Failed to perform global BACK action');
        }
        return ok;
      }

      case 'home': {
        const ok = await Accessibility.performHome();
        if (!ok) {
          throw new Error('Failed to perform global HOME action');
        }
        return ok;
      }

      case 'delay': {
        await new Promise((resolve) => setTimeout(resolve, step.ms));
        return true;
      }

      case 'capture': {
        const counterStr = String(this.captureCounter).padStart(4, '0');
        this.captureCounter += 1;

        const capturedAt = new Date().toISOString();
        const compactUtc = capturedAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const fileName = `${this.config.platform}_${step.section}_${counterStr}_${compactUtc}.png`;
        const dir = `${this.config.caseDir}/${this.config.platform}/screenshots`;
        const filePath = `${dir}/${fileName}`;

        const savedPath = await ScreenCapture.captureScreenshot(filePath);

        this.addLog('capture', step.label ?? step.section, {
          section: step.section,
          filePath: savedPath,
          source: step.source,
        });

        this.emit('capture', step.section, savedPath, step.source);

        // FLAG_SECURE / blank-screen detection
        try {
          const isBlocked = await ScreenCapture.isBlankImage(savedPath);
          if (isBlocked) {
            this.blockedCaptureCount += 1;
            this.addLog('WARNING', step.label ?? step.section, {
              warning: `screen may be protected by FLAG_SECURE: ${step.section}`,
              filePath: savedPath,
              blockedCaptureCount: this.blockedCaptureCount,
            });
            this.emit('captureBlocked', step.section, savedPath);
            await this.config.onCaptureBlocked?.(savedPath, step.section);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          await this.config.onNativeError?.('blank image detection', message);
        }

        if (this.config.onCapture) {
          await this.config.onCapture(savedPath, step.section, step.source, capturedAt);
        }

        return savedPath;
      }

      default: {
        const exhaustiveCheck: never = step;
        throw new Error(`Unhandled step kind: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }

  private addLog(event: string, label?: string, details?: Record<string, unknown> | string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      event,
      label,
      details,
    };
    this.logs.push(entry);
  }
}
