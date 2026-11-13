import type { Step } from '../runner/types';

/** Minimal screen evidence pass appended as a best-effort fallback. */
export function buildFallbackSteps(platform: string, scrollsPerSection: number): Step[] {
  const steps: Step[] = [{
    kind: 'capture',
    section: 'fallback_initial',
    source: `${platform}_fallback`,
    label: 'Fallback capture of current screen',
  }];

  for (let index = 1; index <= scrollsPerSection; index++) {
    steps.push(
      { kind: 'scroll', times: 1, delayMs: 400, label: `Fallback scroll ${index}/${scrollsPerSection}` },
      {
        kind: 'capture',
        section: `fallback_scroll_${index}`,
        source: `${platform}_fallback`,
        label: `Fallback capture after scroll ${index}`,
      },
    );
  }

  return steps;
}
