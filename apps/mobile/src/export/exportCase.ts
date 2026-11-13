import { appendAudit, verifyCase } from '@smp/core';
import RNFS from 'react-native-fs';
import { zip } from 'react-native-zip-archive';
import { RnFileSystem } from '../evidence/RnFileSystem';
import { hashFileSha256, rnSha256 } from '../evidence/sha256';

export type ExportCaseResult =
  | { verified: false; mismatches: string[] }
  | { verified: true; zipPath: string; sha256: string };

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, '');
}

export async function exportCase(caseDir: string): Promise<ExportCaseResult> {
  const fileSystem = new RnFileSystem();
  const verification = await verifyCase(caseDir, fileSystem, rnSha256);
  if (!verification.passed) {
    return { verified: false, mismatches: [...verification.issues] };
  }

  const caseInfo = JSON.parse(await fileSystem.read(`${caseDir}/case.json`)) as { case_id: string };
  const caseId = caseInfo.case_id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const exportDirectory = `${RNFS.ExternalDirectoryPath}/exports`;
  await RNFS.mkdir(exportDirectory);
  const zipPath = `${exportDirectory}/${caseId}_${utcStamp(new Date())}.zip`;

  // This must be inside the case before archiving so the exported audit log records the export.
  // The archive's final SHA-256 is recorded in its adjacent .sha256 sidecar to avoid a
  // self-referential hash that would change as soon as it is written into the archive.
  await appendAudit(
    caseDir,
    {
      actor: 'android_app',
      event_type: 'case_exported',
      details: { zip_path: zipPath },
    },
    fileSystem,
    rnSha256,
  );

  await zip(caseDir, zipPath);
  const sha256 = await hashFileSha256(zipPath);
  const zipName = zipPath.split('/').pop() ?? 'case.zip';
  await RNFS.writeFile(`${zipPath}.sha256`, `${sha256}  ${zipName}\n`, 'utf8');

  return { verified: true, zipPath, sha256 };
}
