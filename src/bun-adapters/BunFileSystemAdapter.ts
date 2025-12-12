/**
 * BunFileSystemAdapter - Bun-specific implementation of FileSystemAdapter
 *
 * Uses Bun's native file APIs for optimal performance in Bun runtime.
 */

import { stat as fsStat, mkdir, readdir, rename, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, normalize, relative } from "node:path";
import type { FileStats, FileSystemAdapter } from "../pure-core/abstractions/FileSystemAdapter.ts";

export class BunFileSystemAdapter implements FileSystemAdapter {
	async exists(path: string): Promise<boolean> {
		try {
			return await Bun.file(path).exists();
		} catch {
			return false;
		}
	}

	async readFile(path: string): Promise<string> {
		const file = Bun.file(path);
		return await file.text();
	}

	readFileSync(path: string): string {
		// Bun.file() is async-first, but we can use the sync require for compatibility
		// Note: This uses Node.js fs module for sync operations
		const fs = require("node:fs");
		return fs.readFileSync(path, "utf-8");
	}

	async writeFile(path: string, content: string): Promise<void> {
		await Bun.write(path, content);
	}

	async deleteFile(path: string): Promise<void> {
		await unlink(path);
	}

	async readBinaryFile(path: string): Promise<Uint8Array> {
		const file = Bun.file(path);
		const buffer = await file.arrayBuffer();
		return new Uint8Array(buffer);
	}

	async writeBinaryFile(path: string, content: Uint8Array): Promise<void> {
		await Bun.write(path, content);
	}

	async createDir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await mkdir(path, { recursive: options?.recursive ?? false });
	}

	async readDir(path: string): Promise<string[]> {
		return await readdir(path);
	}

	async isDirectory(path: string): Promise<boolean> {
		try {
			const stats = await fsStat(path);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	async rename(from: string, to: string): Promise<void> {
		await rename(from, to);
	}

	async stat(path: string): Promise<FileStats> {
		const bunFile = Bun.file(path);
		const stats = await bunFile.stat();
		const nodeStat = await fsStat(path);
		return {
			mtime: new Date(stats.mtime),
			isDirectory: nodeStat.isDirectory(),
			size: stats.size,
		};
	}

	// Path operations (synchronous, using node:path)
	join(...paths: string[]): string {
		return join(...paths);
	}

	dirname(path: string): string {
		return dirname(path);
	}

	basename(path: string, ext?: string): string {
		return basename(path, ext);
	}

	extname(path: string): string {
		return extname(path);
	}

	relative(from: string, to: string): string {
		return relative(from, to);
	}

	isAbsolute(path: string): boolean {
		return isAbsolute(path);
	}

	normalize(path: string): string {
		return normalize(path);
	}

	homedir(): string {
		return homedir();
	}
}
