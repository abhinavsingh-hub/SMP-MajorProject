import React from 'react';
import { act, create } from 'react-test-renderer';
import type { RunnerEvents } from '../src/runner/types';
import type { ScriptRunner } from '../src/runner/ScriptRunner';
import { useScriptRunner } from '../src/runner/useScriptRunner';

class FakeRunner {
  private listeners = new Map<keyof RunnerEvents, Array<(...args: any[]) => void>>();

  on(event: keyof RunnerEvents, listener: (...args: any[]) => void): () => void {
    const current = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...current, listener]);
    return () => this.listeners.set(event, (this.listeners.get(event) ?? []).filter((item) => item !== listener));
  }

  emit<K extends keyof RunnerEvents>(event: K, ...args: Parameters<RunnerEvents[K]>): void {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }

  listenerCount(event: keyof RunnerEvents): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}

describe('useScriptRunner', () => {
  test('tracks status transitions, counters, last capture, and unsubscribes', () => {
    const fake = new FakeRunner();
    const stateRef: { current: ReturnType<typeof useScriptRunner> | null } = { current: null };
    const Harness = () => {
      stateRef.current = useScriptRunner(fake as unknown as ScriptRunner);
      return null;
    };
    const treeRef: { current: ReturnType<typeof create> | null } = { current: null };
    const currentState = () => stateRef.current!;
    act(() => { treeRef.current = create(<Harness />); });
    expect(currentState().status).toBe('idle');

    act(() => {
      fake.emit('progress', 2, 8);
      fake.emit('stepStart', { kind: 'capture', section: 'profile', label: 'Capture profile' }, 1);
      fake.emit('capture', 'profile', '/tmp/profile.png', 'instagram');
      fake.emit('captureBlocked', 'profile', '/tmp/profile.png');
      fake.emit('stepFailed', { kind: 'clickByText', text: 'Profile' }, 3, new Error('Missing label'));
    });
    expect(currentState().status).toBe('running');
    expect(currentState().currentLabel).toBe('Capture profile');
    expect(currentState().progress).toEqual({ index: 2, total: 8 });
    expect(currentState().captureCount).toBe(1);
    expect(currentState().blockedCount).toBe(1);
    expect(currentState().failedCount).toBe(1);
    expect(currentState().lastScreenshotPath).toBe('/tmp/profile.png');
    expect(currentState().recentEvents[0].kind).toBe('failed');

    act(() => fake.emit('paused'));
    expect(currentState().status).toBe('paused');
    act(() => fake.emit('resumed'));
    expect(currentState().status).toBe('running');
    act(() => fake.emit('done'));
    expect(currentState().status).toBe('done');

    act(() => treeRef.current?.unmount());
    expect(fake.listenerCount('capture')).toBe(0);
    expect(fake.listenerCount('done')).toBe(0);
  });
});
