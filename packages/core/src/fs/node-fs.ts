/**
 * Node.js implementation of the FileSystem interface.
 *
 * Uses `node:fs/promises` and `node:path`. This file must NOT be imported
 * from platform-independent code — only from desktop-app code and tests.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { FileSystem, DirEntry, WriteOptions } from './interface.ts';

export class NodeFileSystem implements FileSystem {
  async read(filePath: string): Promise<string> {
    return fsp.readFile(filePath, 'utf-8');
  }

  async write(
    filePath: string,
    content: string,
    options?: WriteOptions,
  ): Promise<void> {
    if (options?.recursive) {
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
    }
    await fsp.writeFile(filePath, content, 'utf-8');
  }

  async append(filePath: string, content: string): Promise<void> {
    // Ensure the parent directory exists before appending.
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.appendFile(filePath, content, 'utf-8');
  }

  async list(dirPath: string): Promise<DirEntry[]> {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }));
  }

  async exists(targetPath: string): Promise<boolean> {
    try {
      await fsp.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Node.js SHA-256 helper.
 *
 * Returns the hex digest of a UTF-8 string. Suitable as a `Sha256Fn`
 * argument for audit-log functions.
 */
export async function nodeSha256(data: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}
