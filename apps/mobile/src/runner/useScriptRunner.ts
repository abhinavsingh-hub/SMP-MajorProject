import { useEffect, useState } from 'react';
import type { ScriptRunner } from './ScriptRunner';
import type { Step } from './types';

export type ScriptRunnerStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'done' | 'error';
export type RunnerEventKind = 'success' | 'failed' | 'warning' | 'info';

export interface RecentRunnerEvent {
  id: string;
  timestamp: string;
  kind: RunnerEventKind;
  title: string;
  detail?: string;
}

export interface ScriptRunnerViewState {
  status: ScriptRunnerStatus;
  currentLabel: string;
  progress: { index: number; total: number };
  captureCount: number;
  blockedCount: number;
  failedCount: number;
  recentEvents: RecentRunnerEvent[];
  lastScreenshotPath: string;
}

const initialState = (): ScriptRunnerViewState => ({
  status: 'idle',
  currentLabel: '',
  progress: { index: 0, total: 0 },
  captureCount: 0,
  blockedCount: 0,
  failedCount: 0,
  recentEvents: [],
  lastScreenshotPath: '',
});

export function useScriptRunner(runner: ScriptRunner | null): ScriptRunnerViewState {
  const [state, setState] = useState<ScriptRunnerViewState>(initialState);

  useEffect(() => {
    setState(initialState());
    if (!runner) return undefined;

    let eventId = 0;
    const subscriptions: Array<() => void> = [];
    const addEvent = (kind: RunnerEventKind, title: string, detail?: string) => {
      const event: RecentRunnerEvent = {
        id: String(++eventId),
        timestamp: new Date().toISOString(),
        kind,
        title,
        detail,
      };
      setState((current) => ({
        ...current,
        recentEvents: [event, ...current.recentEvents].slice(0, 50),
      }));
    };

    subscriptions.push(
      runner.on('progress', (index, total) => {
        setState((current) => ({ ...current, status: 'running', progress: { index, total } }));
      }),
      runner.on('stepStart', (step: Step) => {
        const label = step.label ?? step.kind;
        setState((current) => ({ ...current, status: 'running', currentLabel: label }));
        addEvent('info', 'Step started', label);
      }),
      runner.on('stepSuccess', (step: Step) => addEvent('success', 'Step completed', step.label ?? step.kind)),
      runner.on('stepFailed', (step: Step, _index, error) => {
        setState((current) => ({ ...current, failedCount: current.failedCount + 1 }));
        addEvent('failed', 'Step failed', `${step.label ?? step.kind}: ${error.message}`);
      }),
      runner.on('capture', (_section, path) => {
        setState((current) => ({ ...current, captureCount: current.captureCount + 1, lastScreenshotPath: path }));
        addEvent('info', 'Screenshot captured', path);
      }),
      runner.on('captureBlocked', (section, path) => {
        setState((current) => ({ ...current, blockedCount: current.blockedCount + 1 }));
        addEvent('warning', 'Capture may be protected', `${section} · ${path}`);
      }),
      runner.on('paused', () => {
        setState((current) => ({ ...current, status: 'paused' }));
        addEvent('info', 'Capture paused');
      }),
      runner.on('resumed', () => {
        setState((current) => ({ ...current, status: 'running' }));
        addEvent('info', 'Capture resumed');
      }),
      runner.on('stopped', () => {
        setState((current) => ({ ...current, status: 'stopped' }));
        addEvent('info', 'Capture stopped');
      }),
      runner.on('done', () => {
        setState((current) => ({ ...current, status: 'done' }));
        addEvent('success', 'Capture complete');
      }),
      runner.on('error', (error) => {
        setState((current) => ({ ...current, status: 'error' }));
        addEvent('failed', 'Capture error', error.message);
      }),
    );

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [runner]);

  return state;
}
