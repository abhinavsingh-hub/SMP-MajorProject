import RNFS from 'react-native-fs';
import type { ScriptOptions } from '../scripts';

export interface CaptureRunState {
  platform: string;
  scriptOptions: ScriptOptions;
  index: number;
  captureCounter: number;
  status: 'running' | 'stopped' | 'done';
}

export interface ResumableCase {
  caseDir: string;
  caseNumber: string;
  examinerName: string;
  accusedName: string;
  runState: CaptureRunState;
}

export async function readRunState(caseDir: string): Promise<CaptureRunState | null> {
  try {
    const raw = await RNFS.readFile(`${caseDir}/.run_state.json`, 'utf8');
    const value = JSON.parse(raw) as Partial<CaptureRunState>;
    if (typeof value.platform !== 'string' || !value.scriptOptions || typeof value.scriptOptions !== 'object' ||
      !Number.isInteger(value.index) || (value.index ?? -2) < -1 || !Number.isInteger(value.captureCounter) ||
      (value.captureCounter ?? 0) < 1 || (value.status !== 'running' && value.status !== 'stopped' && value.status !== 'done')) return null;
    return value as CaptureRunState;
  } catch {
    return null;
  }
}

export async function findResumableCases(platform?: string): Promise<ResumableCase[]> {
  try {
    const root = `${RNFS.DocumentDirectoryPath}/cases`;
    if (!(await RNFS.exists(root))) return [];
    const entries = await RNFS.readDir(root);
    const found: ResumableCase[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const runState = await readRunState(entry.path);
      if (!runState || runState.status !== 'running' || (platform && runState.platform.toLowerCase() !== platform.toLowerCase())) continue;
      try {
        const caseData = JSON.parse(await RNFS.readFile(`${entry.path}/case.json`, 'utf8')) as {
          case_number: string; examiner_name: string; accused_name: string;
        };
        found.push({ caseDir: entry.path, caseNumber: caseData.case_number, examinerName: caseData.examiner_name, accusedName: caseData.accused_name, runState });
      } catch { /* Ignore incomplete case folders. */ }
    }
    return found;
  } catch {
    return [];
  }
}
