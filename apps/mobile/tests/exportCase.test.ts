import RNFS from 'react-native-fs';
import { appendAudit, verifyCase } from '@smp/core';
import { zip } from 'react-native-zip-archive';
import { exportCase } from '../src/export/exportCase';

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    ExternalDirectoryPath: '/storage/emulated/0/Android/data/com.socialparse.mobile/files',
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    hash: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('@smp/core', () => ({
  appendAudit: jest.fn(),
  verifyCase: jest.fn(),
}));

jest.mock('react-native-zip-archive', () => ({ zip: jest.fn() }));

describe('exportCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyCase as jest.Mock).mockResolvedValue({ passed: true, issues: [], itemsChecked: 2 });
    (appendAudit as jest.Mock).mockResolvedValue({});
    (RNFS.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ case_id: 'CASE-2026-0001' }));
    (RNFS.hash as jest.Mock).mockResolvedValue('a'.repeat(64));
    (RNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
    (RNFS.writeFile as jest.Mock).mockResolvedValue(undefined);
    (zip as jest.Mock).mockResolvedValue(undefined);
  });

  test('blocks export and returns verification mismatches', async () => {
    (verifyCase as jest.Mock).mockResolvedValue({ passed: false, issues: ['manifest hash mismatch'] });

    const result = await exportCase('/case/CASE-2026-0001');

    expect(result).toEqual({ verified: false, mismatches: ['manifest hash mismatch'] });
    expect(appendAudit).not.toHaveBeenCalled();
    expect(zip).not.toHaveBeenCalled();
  });

  test('writes the export audit event before invoking zip', async () => {
    const order: string[] = [];
    (appendAudit as jest.Mock).mockImplementation(async (_dir, event) => {
      order.push('audit');
      expect(event).toMatchObject({
        event_type: 'case_exported',
        details: { zip_path: expect.stringMatching(/CASE-2026-0001_.*\.zip$/) },
      });
    });
    (zip as jest.Mock).mockImplementation(async () => { order.push('zip'); });

    const result = await exportCase('/case/CASE-2026-0001');

    expect(result.verified).toBe(true);
    expect(order).toEqual(['audit', 'zip']);
  });

  test('writes the SHA-256 sidecar alongside the ZIP', async () => {
    const result = await exportCase('/case/CASE-2026-0001');
    expect(result.verified).toBe(true);
    if (!result.verified) return;
    expect(RNFS.writeFile).toHaveBeenCalledWith(
      `${result.zipPath}.sha256`,
      `${'a'.repeat(64)}  ${result.zipPath.split('/').pop()}\n`,
      'utf8',
    );
  });
});
