/**
 * InMemoryFileSystemAdapter - In-memory implementation for testing
 *
 * Stores all files in memory without touching the actual filesystem.
 * Useful for unit tests that need fast, isolated filesystem operations.
 */

import type { FileStats, FileSystemAdapter } from "../pure-core/abstractions/FileSystemAdapter.ts";

interface InMemoryFile {
	content: string | Uint8Array;
	mtime: Date;
	isDirectory: boolean;
}

export class InMemoryFileSystemAdapter implements FileSystemAdapter {
	private files: Map<string, InMemoryFile> = new Map();
	private homeDir = "/home/test";

	/**
	 * Set up a test directory structure
	 */
	setupTestRepo(basePath: string): void {
		this.createDirSync(basePath);
	}

	/**
	 * Clear all files from memory
	 */
	clear(): void {
		this.files.clear();
	}

	/**
	 * Get all file paths in memory (for debugging)
	 */
	getAllPaths(): string[] {
		return Array.from(this.files.keys());
	}

	/**
	 * Set the home directory path
	 */
	setHomeDir(path: string): void {
		this.homeDir = path;
	}

	// FileSystemAdapter implementation

	async exists(path: string): Promise<boolean> {
		const normalized = this.normalizePath(path);
		return this.files.has(normalized);
	}

	async readFile(path: string): Promise<string> {
		const normalized = this.normalizePath(path);
		const file = this.files.get(normalized);
		if (!file) {
			throw new Error(`ENOENT: no such file or directory, open '${path}'`);
		}
		if (file.isDirectory) {
			throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
		}
		if (file.content instanceof Uint8Array) {
			return new TextDecoder().decode(file.content);
		}
		return file.content;
	}

	readFileSync(path: string): string {
		const normalized = this.normalizePath(path);
		const file = this.files.get(normalized);
		if (!file) {
			throw new Error(`ENOENT: no such file or directory, open '${path}'`);
		}
		if (file.isDirectory) {
			throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
		}
		if (file.content instanceof Uint8Array) {
			return new TextDecoder().decode(file.content);
		}
		return file.content;
	}

	async writeFile(path: string, content: string): Promise<void> {
		const normalized = this.normalizePath(path);
		// Ensure parent directory exists
		const dir = this.dirname(normalized);
		if (dir && dir !== normalized && !this.files.has(dir)) {
			await this.createDir(dir, { recursive: true });
		}
		this.files.set(normalized, {
			content,
			mtime: new Date(),
			isDirectory: false,
		});
	}

	async deleteFile(path: string): Promise<void> {
		const normalized = this.normalizePath(path);
		if (!this.files.has(normalized)) {
			throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
		}
		this.files.delete(normalized);
	}

	async readBinaryFile(path: string): Promise<Uint8Array> {
		const normalized = this.normalizePath(path);
		const file = this.files.get(normalized);
		if (!file) {
			throw new Error(`ENOENT: no such file or directory, open '${path}'`);
		}
		if (file.isDirectory) {
			throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
		}
		if (file.content instanceof Uint8Array) {
			return file.content;
		}
		return new TextEncoder().encode(file.content);
	}

	async writeBinaryFile(path: string, content: Uint8Array): Promise<void> {
		const normalized = this.normalizePath(path);
		// Ensure parent directory exists
		const dir = this.dirname(normalized);
		if (dir && dir !== normalized && !this.files.has(dir)) {
			await this.createDir(dir, { recursive: true });
		}
		this.files.set(normalized, {
			content,
			mtime: new Date(),
			isDirectory: false,
		});
	}

	async createDir(path: string, options?: { recursive?: boolean }): Promise<void> {
		const normalized = this.normalizePath(path);
		if (options?.recursive) {
			// Create all parent directories
			const parts = normalized.split("/").filter(Boolean);
			let currentPath = normalized.startsWith("/") ? "" : "";
			for (const part of parts) {
				currentPath = currentPath ? `${currentPath}/${part}` : normalized.startsWith("/") ? `/${part}` : part;
				if (!this.files.has(currentPath)) {
					this.files.set(currentPath, {
						content: "",
						mtime: new Date(),
						isDirectory: true,
					});
				}
			}
		} else {
			this.files.set(normalized, {
				content: "",
				mtime: new Date(),
				isDirectory: true,
			});
		}
	}

	private createDirSync(path: string): void {
		const normalized = this.normalizePath(path);
		const parts = normalized.split("/").filter(Boolean);
		let currentPath = normalized.startsWith("/") ? "" : "";
		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : normalized.startsWith("/") ? `/${part}` : part;
			if (!this.files.has(currentPath)) {
				this.files.set(currentPath, {
					content: "",
					mtime: new Date(),
					isDirectory: true,
				});
			}
		}
	}

	async readDir(path: string): Promise<string[]> {
		const normalized = this.normalizePath(path);
		const prefix = normalized.endsWith("/") ? normalized : `${normalized}/`;
		const entries: Set<string> = new Set();

		for (const filePath of this.files.keys()) {
			if (filePath.startsWith(prefix)) {
				const relativePath = filePath.slice(prefix.length);
				const firstPart = relativePath.split("/")[0];
				if (firstPart) {
					entries.add(firstPart);
				}
			}
		}

		return Array.from(entries);
	}

	async isDirectory(path: string): Promise<boolean> {
		const normalized = this.normalizePath(path);
		const file = this.files.get(normalized);
		return file?.isDirectory ?? false;
	}

	async rename(from: string, to: string): Promise<void> {
		const normalizedFrom = this.normalizePath(from);
		const normalizedTo = this.normalizePath(to);

		const file = this.files.get(normalizedFrom);
		if (!file) {
			throw new Error(`ENOENT: no such file or directory, rename '${from}' -> '${to}'`);
		}

		// Ensure parent directory of target exists
		const targetDir = this.dirname(normalizedTo);
		if (targetDir && targetDir !== normalizedTo && !this.files.has(targetDir)) {
			await this.createDir(targetDir, { recursive: true });
		}

		// If it's a directory, move all children too
		if (file.isDirectory) {
			const prefix = normalizedFrom.endsWith("/") ? normalizedFrom : `${normalizedFrom}/`;
			const toPrefix = normalizedTo.endsWith("/") ? normalizedTo : `${normalizedTo}/`;

			const toMove: Array<[string, string]> = [];
			for (const filePath of this.files.keys()) {
				if (filePath.startsWith(prefix)) {
					const newPath = toPrefix + filePath.slice(prefix.length);
					toMove.push([filePath, newPath]);
				}
			}

			for (const [oldPath, newPath] of toMove) {
				const data = this.files.get(oldPath);
				if (data) {
					this.files.delete(oldPath);
					this.files.set(newPath, data);
				}
			}
		}

		this.files.delete(normalizedFrom);
		this.files.set(normalizedTo, { ...file, mtime: new Date() });
	}

	async stat(path: string): Promise<FileStats> {
		const normalized = this.normalizePath(path);
		const file = this.files.get(normalized);
		if (!file) {
			throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
		}
		const size =
			file.content instanceof Uint8Array ? file.content.length : new TextEncoder().encode(file.content).length;
		return {
			mtime: file.mtime,
			isDirectory: file.isDirectory,
			size,
		};
	}

	// Path operations (synchronous, pure string manipulation)

	join(...paths: string[]): string {
		const result = paths.filter(Boolean).join("/").replace(/\/+/g, "/").replace(/\/$/, "");
		return result || ".";
	}

	dirname(path: string): string {
		const normalized = this.normalizePath(path);
		const lastSlash = normalized.lastIndexOf("/");
		if (lastSlash === -1) return ".";
		if (lastSlash === 0) return "/";
		return normalized.slice(0, lastSlash);
	}

	basename(path: string, ext?: string): string {
		const normalized = this.normalizePath(path);
		let base = normalized.split("/").pop() || "";
		if (ext && base.endsWith(ext)) {
			base = base.slice(0, -ext.length);
		}
		return base;
	}

	extname(path: string): string {
		const base = this.basename(path);
		const dotIndex = base.lastIndexOf(".");
		if (dotIndex === -1 || dotIndex === 0) return "";
		return base.slice(dotIndex);
	}

	relative(from: string, to: string): string {
		const fromParts = this.normalizePath(from).split("/").filter(Boolean);
		const toParts = this.normalizePath(to).split("/").filter(Boolean);

		// Find common prefix
		let commonLength = 0;
		while (
			commonLength < fromParts.length &&
			commonLength < toParts.length &&
			fromParts[commonLength] === toParts[commonLength]
		) {
			commonLength++;
		}

		// Build relative path
		const upCount = fromParts.length - commonLength;
		const remaining = toParts.slice(commonLength);

		const parts = [...Array(upCount).fill(".."), ...remaining];
		return parts.join("/") || ".";
	}

	isAbsolute(path: string): boolean {
		return path.startsWith("/");
	}

	normalize(path: string): string {
		return this.normalizePath(path);
	}

	homedir(): string {
		return this.homeDir;
	}

	// Helper methods

	private normalizePath(path: string): string {
		// Handle Windows-style paths
		let normalized = path.replace(/\\/g, "/");

		// Remove trailing slashes (except for root)
		if (normalized.length > 1 && normalized.endsWith("/")) {
			normalized = normalized.slice(0, -1);
		}

		// Handle . and ..
		const parts = normalized.split("/");
		const result: string[] = [];
		const isAbsolute = normalized.startsWith("/");

		for (const part of parts) {
			if (part === "." || part === "") continue;
			if (part === "..") {
				if (result.length > 0 && result[result.length - 1] !== "..") {
					result.pop();
				} else if (!isAbsolute) {
					result.push("..");
				}
			} else {
				result.push(part);
			}
		}

		const finalPath = result.join("/");
		return isAbsolute ? `/${finalPath}` : finalPath || ".";
	}
}
