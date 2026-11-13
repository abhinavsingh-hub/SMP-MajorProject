jest.mock('react-native-fs', () => ({ __esModule: true, default: {} }));

import { EvidenceService } from '../src/evidence/EvidenceService';
import type { FileSystem, DirEntry, WriteOptions } from '@socialparse/core';

// In-memory mock filesystem implementing FileSystem interface
class MockFileSystem implements FileSystem {
  public files: Map<string, string> = new Map();

  async read(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  async readBinary(filePath: string): Promise<Uint8Array> {
    const text = await this.read(filePath);
    return new TextEncoder().encode(text);
  }

  async write(filePath: string, content: string, _options?: WriteOptions): Promise<void> {
    this.files.set(filePath, content);
  }

  async writeBinary(filePath: string, content: Uint8Array, _options?: WriteOptions): Promise<void> {
    this.files.set(filePath, new TextDecoder().decode(content));
  }

  async append(filePath: string, content: string): Promise<void> {
    const existing = this.files.get(filePath) || '';
    this.files.set(filePath, existing + content);
  }

  async list(dirPath: string): Promise<DirEntry[]> {
    const entries: DirEntry[] = [];
    const prefix = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const sub = key.slice(prefix.length).split('/')[0];
        if (!entries.some((e) => e.name === sub)) {
          entries.push({ name: sub, isDirectory: key.slice(prefix.length).includes('/') });
        }
      }
    }
    return entries;
  }

  async exists(targetPath: string): Promise<boolean> {
    return this.files.has(targetPath);
  }

  async stat(targetPath: string): Promise<{ size: number }> {
    const content = this.files.get(targetPath) || '';
    return { size: content.length };
  }
}

// Simple deterministic hash for unit testing
const mockSha256 = async (data: string | Uint8Array): Promise<string> => {
  const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(64, '0');
};

describe('EvidenceService', () => {
  test('Creates case folder, records screenshot, and verifies integrity', async () => {
    const mockFs = new MockFileSystem();
    const service = new EvidenceService('', 'telegram', mockFs, mockSha256);

    // 1. Create case
    const caseResult = await service.createCase({
      caseNumber: 'CASE-2026-0042',
      examinerName: 'Insp. V. Sharma',
      accusedName: 'John Doe',
      platform: 'telegram',
    });

    const caseFolder = caseResult.caseFolderPath;
    expect(caseFolder).toContain('CASE-2026-0042');
    expect(await mockFs.exists(`${caseFolder}/case.json`)).toBe(true);
    expect(await mockFs.exists(`${caseFolder}/manifest.json`)).toBe(true);
    expect(await mockFs.exists(`${caseFolder}/hashes.csv`)).toBe(true);
    expect(await mockFs.exists(`${caseFolder}/audit_log.jsonl`)).toBe(true);

    // 2. Pre-stage a screenshot file in mock filesystem
    const screenshotPath = `${caseFolder}/telegram/screenshots/telegram_chat_0001_20261113T120000Z.png`;
    await mockFs.write(screenshotPath, 'PNG_BINARY_MOCK_DATA', { recursive: true });

    // 3. Record screenshot
    const recordedItem = await service.onCapture(
      screenshotPath,
      'chat',
      'auto_runner',
      '2026-11-13T12:00:00.000Z',
    );

    expect(recordedItem.item_id).toBe('ITEM-0001');
    expect(recordedItem.section).toBe('chat');

    const manifest = JSON.parse(await mockFs.read(`${caseFolder}/manifest.json`));
    expect(manifest.items).toHaveLength(1);
    expect(manifest.items[0].item_id).toBe('ITEM-0001');

    const hashesCsv = await mockFs.read(`${caseFolder}/hashes.csv`);
    expect(hashesCsv).toContain('ITEM-0001');

    const auditLog = await mockFs.read(`${caseFolder}/audit_log.jsonl`);
    expect(auditLog).toContain('case_created');
    expect(auditLog).toContain('item_captured');

    // 4. Verify case integrity
    const verification = await service.verifyCaseIntegrity();
    expect(verification.passed).toBe(true);
    expect(verification.itemsChecked).toBe(1);
    expect(verification.issues).toHaveLength(0);
  });
});
