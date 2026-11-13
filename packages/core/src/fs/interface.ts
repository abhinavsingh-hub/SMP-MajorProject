/**
 * Platform-independent FileSystem interface.
 *
 * This interface abstracts file-system operations so that the core library
 * can be used on both desktop (Node.js) and Android (React Native) without
 * importing platform-specific modules.
 *
 * Implementations must handle directory creation transparently when writing
 * files (i.e. create parent directories as needed).
 */

/**
 * A single directory entry returned by `list()`.
 */
export interface DirEntry {
  /** Base name of the entry (file or directory name, not the full path). */
  name: string;
  /** Whether this entry is a directory. */
  isDirectory: boolean;
}

/**
 * Options for the `write` operation.
 */
export interface WriteOptions {
  /**
   * If `true`, create parent directories automatically when they don't exist.
   * Defaults to `false` if not provided.
   */
  recursive?: boolean;
}

/**
 * Platform-independent file-system operations.
 *
 * All paths are absolute strings. The interface does not assume any
 * path-separator convention — callers should use the helpers from `paths.ts`
 * or platform utilities to build paths.
 *
 * Error handling:
 *   - `read` throws if the file does not exist.
 *   - `write` creates or overwrites a file. With `recursive: true` it also
 *     creates parent directories.
 *   - `append` creates the file if it does not exist; otherwise appends.
 *   - `list` throws if the directory does not exist.
 *   - `exists` never throws — it returns `false` for missing paths.
 */
export interface FileSystem {
  /** Read the entire file as a UTF-8 string. Throws if not found. */
  read(path: string): Promise<string>;

  /**
   * Write `content` (UTF-8) to `path`, creating or overwriting the file.
   * With `options.recursive: true` parent directories are created as needed.
   */
  write(path: string, content: string, options?: WriteOptions): Promise<void>;

  /** Append `content` (UTF-8) to `path`, creating the file if necessary. */
  append(path: string, content: string): Promise<void>;

  /** List directory entries. Throws if the directory does not exist. */
  list(path: string): Promise<DirEntry[]>;

  /** Return `true` if the path (file or directory) exists. Never throws. */
  exists(path: string): Promise<boolean>;
}
