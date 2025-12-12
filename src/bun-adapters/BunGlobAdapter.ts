/**
 * BunGlobAdapter - Bun-specific implementation of GlobAdapter
 *
 * Uses Bun's native Glob API for optimal performance in Bun runtime.
 */

import type { GlobAdapter, GlobOptions } from "../pure-core/abstractions/GlobAdapter.ts";

export class BunGlobAdapter implements GlobAdapter {
	async scan(pattern: string, options: GlobOptions): Promise<string[]> {
		const glob = new Bun.Glob(pattern);

		const scanOptions: {
			cwd: string;
			dot?: boolean;
			onlyFiles?: boolean;
		} = {
			cwd: options.cwd,
		};

		if (options.dot !== undefined) {
			scanOptions.dot = options.dot;
		}

		if (options.onlyFiles !== undefined) {
			scanOptions.onlyFiles = options.onlyFiles;
		}

		// Bun.Glob.scan returns an async iterable
		const results: string[] = [];
		for await (const file of glob.scan(scanOptions)) {
			// Apply ignore patterns if specified
			if (options.ignore && options.ignore.length > 0) {
				const shouldIgnore = options.ignore.some((ignorePattern) => {
					const ignoreGlob = new Bun.Glob(ignorePattern);
					return ignoreGlob.match(file);
				});
				if (shouldIgnore) continue;
			}

			results.push(file);
		}

		return results;
	}

	scanSync(pattern: string, options: GlobOptions): string[] {
		const glob = new Bun.Glob(pattern);

		const scanOptions: {
			cwd: string;
			dot?: boolean;
			onlyFiles?: boolean;
		} = {
			cwd: options.cwd,
		};

		if (options.dot !== undefined) {
			scanOptions.dot = options.dot;
		}

		if (options.onlyFiles !== undefined) {
			scanOptions.onlyFiles = options.onlyFiles;
		}

		// Use Array.fromAsync equivalent for sync
		const results: string[] = [];
		for (const file of glob.scanSync(scanOptions)) {
			// Apply ignore patterns if specified
			if (options.ignore && options.ignore.length > 0) {
				const shouldIgnore = options.ignore.some((ignorePattern) => {
					const ignoreGlob = new Bun.Glob(ignorePattern);
					return ignoreGlob.match(file);
				});
				if (shouldIgnore) continue;
			}

			results.push(file);
		}

		return results;
	}

	match(pattern: string, path: string): boolean {
		const glob = new Bun.Glob(pattern);
		return glob.match(path);
	}
}
