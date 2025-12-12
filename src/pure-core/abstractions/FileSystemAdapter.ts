/**
 * FileSystemAdapter - Abstract interface for filesystem operations
 *
 * This interface abstracts away the underlying filesystem implementation,
 * allowing the same business logic to run in different environments:
 * - Bun (BunFileSystemAdapter)
 * - Node.js (NodeFileSystemAdapter)
 * - Browser (BrowserFileSystemAdapter - uses localStorage or in-memory)
 * - Tests (InMemoryFileSystemAdapter)
 */

export interface FileStats {
	mtime: Date;
	isDirectory: boolean;
	size: number;
}

export interface FileSystemAdapter {
	// File operations
	exists(path: string): Promise<boolean>;
	readFile(path: string): Promise<string>;
	readFileSync?(path: string): string;
	writeFile(path: string, content: string): Promise<void>;
	deleteFile(path: string): Promise<void>;

	// Binary file operations (for images, etc.)
	readBinaryFile?(path: string): Promise<Uint8Array>;
	writeBinaryFile?(path: string, content: Uint8Array): Promise<void>;

	// Directory operations
	createDir(path: string, options?: { recursive?: boolean }): Promise<void>;
	readDir(path: string): Promise<string[]>;
	isDirectory(path: string): Promise<boolean>;
	rename(from: string, to: string): Promise<void>;

	// File metadata
	stat(path: string): Promise<FileStats>;

	// Path operations (synchronous, pure string manipulation)
	join(...paths: string[]): string;
	dirname(path: string): string;
	basename(path: string, ext?: string): string;
	extname(path: string): string;
	relative(from: string, to: string): string;
	isAbsolute(path: string): boolean;
	normalize(path: string): string;

	// Environment-specific helpers
	homedir(): string;
}
