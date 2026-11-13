import type { Step } from '../runner/types';
import { buildTelegramScript } from './telegram/telegramScript';

export interface ScriptOptions {
  maxChats?: number;
  scrollsPerSection?: number;
}

export type PlatformScriptBuilder = (options?: ScriptOptions) => Step[];

/**
 * Platform Script Registry.
 * Maps platform identifiers to their respective automated evidentiary script builders.
 */
export const scriptRegistry: Record<string, PlatformScriptBuilder> = {
  telegram: (options) =>
    buildTelegramScript({
      maxChats: options?.maxChats ?? 3,
      scrollsPerSection: options?.scrollsPerSection ?? 2,
    }),
};

/**
 * Retrieves the compiled step pipeline for the given platform.
 * Throws a descriptive error if the platform has no registered automation script.
 */
export function getScriptForPlatform(platform: string, options?: ScriptOptions): Step[] {
  const normalized = platform.trim().toLowerCase();
  const builder = scriptRegistry[normalized];
  if (!builder) {
    throw new Error(
      `No automated forensic capture script registered for target: "${platform}". Available platforms: [${Object.keys(
        scriptRegistry,
      ).join(', ')}]`,
    );
  }
  return builder(options);
}

/**
 * Checks whether an automated pipeline is registered for a given platform.
 */
export function isPlatformSupported(platform: string): boolean {
  return Boolean(scriptRegistry[platform.trim().toLowerCase()]);
}
