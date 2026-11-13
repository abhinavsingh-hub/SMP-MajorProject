import RNFS from 'react-native-fs';
import type { DirEntry, FileSystem, WriteOptions } from '@socialparse/core';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export class RnFileSystem implements FileSystem {
  async read(filePath: string): Promise<string> {
    return RNFS.readFile(filePath, 'utf8');
  }

  async readBinary(filePath: string): Promise<Uint8Array> {
    const base64 = await RNFS.readFile(filePath, 'base64');
    return base64ToUint8Array(base64);
  }

  async write(
    filePath: string,
    content: string,
    options?: WriteOptions,
  ): Promise<void> {
    if (options?.recursive) {
      await this.ensureParentDir(filePath);
    }
    await RNFS.writeFile(filePath, content, 'utf8');
  }

  async writeBinary(
    filePath: string,
    content: Uint8Array,
    options?: WriteOptions,
  ): Promise<void> {
    if (options?.recursive) {
      await this.ensureParentDir(filePath);
    }
    const base64 = uint8ArrayToBase64(content);
    await RNFS.writeFile(filePath, base64, 'base64');
  }

  async append(filePath: string, content: string): Promise<void> {
    await this.ensureParentDir(filePath);
    await RNFS.appendFile(filePath, content, 'utf8');
  }

  async list(dirPath: string): Promise<DirEntry[]> {
    const entries = await RNFS.readDir(dirPath);
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  }

  async exists(targetPath: string): Promise<boolean> {
    return RNFS.exists(targetPath);
  }

  async stat(targetPath: string): Promise<{ size: number }> {
    const statResult = await RNFS.stat(targetPath);
    return { size: statResult.size };
  }

  async mkdir(dirPath: string): Promise<void> {
    if (!(await RNFS.exists(dirPath))) {
      await RNFS.mkdir(dirPath);
    }
  }

  private async ensureParentDir(filePath: string): Promise<void> {
    const lastSlash = filePath.lastIndexOf('/');
    if (lastSlash > 0) {
      const parentDir = filePath.substring(0, lastSlash);
      await this.mkdir(parentDir);
    }
  }
}
