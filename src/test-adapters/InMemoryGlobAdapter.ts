/**
 * InMemoryGlobAdapter - In-memory glob implementation for testing
 *
 * Works with InMemoryFileSystemAdapter to scan files using glob patterns.
 * Uses simple pattern matching without external dependencies.
 */

import type { GlobAdapter, GlobOptions } from "../pure-core/abstractions/GlobAdapter.ts";
import type { InMemoryFileSystemAdapter } from "./InMemoryFileSystemAdapter.ts";

export class InMemoryGlobAdapter implements GlobAdapter {
	constructor(private fsAdapter: InMemoryFileSystemAdapter) {}

	async scan(pattern: string, options: GlobOptions): Promise<string[]> {
		const allPaths = this.fsAdapter.getAllPaths();
		const cwd = this.normalizePath(options.cwd);
		const cwdPrefix = cwd.endsWith("/") ? cwd : `${cwd}/`;

		// Get all paths under the cwd
		const relevantPaths = allPaths
			.filter((path) => path.startsWith(cwdPrefix))
			.map((path) => path.slice(cwdPrefix.length))
			.filter((path) => path.length > 0);

		// Filter by glob pattern
		const regex = this.globToRegex(pattern);
		let matches = relevantPaths.filter((path) => regex.test(path));

		// Apply ignore patterns if specified
		if (options.ignore && options.ignore.length > 0) {
			const ignoreRegexes = options.ignore.map((p) => this.globToRegex(p));
			matches = matches.filter((path) => !ignoreRegexes.some((r) => r.test(path)));
		}

		// Filter directories vs files if requested
		if (options.onlyFiles !== false) {
			const filtered: string[] = [];
			for (const path of matches) {
				const fullPath = `${cwdPrefix}${path}`;
				const isDir = await this.fsAdapter.isDirectory(fullPath);
				if (!isDir) {
					filtered.push(path);
				}
			}
			matches = filtered;
		}

		if (options.onlyDirectories) {
			const filtered: string[] = [];
			for (const path of matches) {
				const fullPath = `${cwdPrefix}${path}`;
				const isDir = await this.fsAdapter.isDirectory(fullPath);
				if (isDir) {
					filtered.push(path);
				}
			}
			matches = filtered;
		}

		// Filter dot files unless explicitly included
		if (!options.dot) {
			matches = matches.filter((path) => {
				const parts = path.split("/");
				return !parts.some((part) => part.startsWith("."));
			});
		}

		return matches.sort();
	}

	scanSync(pattern: string, options: GlobOptions): string[] {
		// For simplicity, we'll make this synchronous by not checking isDirectory
		// In a real implementation, this would need a sync version of the fs adapter
		const allPaths = this.fsAdapter.getAllPaths();
		const cwd = this.normalizePath(options.cwd);
		const cwdPrefix = cwd.endsWith("/") ? cwd : `${cwd}/`;

		// Get all paths under the cwd
		const relevantPaths = allPaths
			.filter((path) => path.startsWith(cwdPrefix))
			.map((path) => path.slice(cwdPrefix.length))
			.filter((path) => path.length > 0);

		// Filter by glob pattern
		const regex = this.globToRegex(pattern);
		let matches = relevantPaths.filter((path) => regex.test(path));

		// Apply ignore patterns if specified
		if (options.ignore && options.ignore.length > 0) {
			const ignoreRegexes = options.ignore.map((p) => this.globToRegex(p));
			matches = matches.filter((path) => !ignoreRegexes.some((r) => r.test(path)));
		}

		// Filter dot files unless explicitly included
		if (!options.dot) {
			matches = matches.filter((path) => {
				const parts = path.split("/");
				return !parts.some((part) => part.startsWith("."));
			});
		}

		return matches.sort();
	}

	match(pattern: string, path: string): boolean {
		const regex = this.globToRegex(pattern);
		return regex.test(path);
	}

	/**
	 * Convert a glob pattern to a regular expression
	 */
	private globToRegex(pattern: string): RegExp {
		let regexStr = "";
		let i = 0;

		while (i < pattern.length) {
			const char = pattern[i];
			const nextChar = pattern[i + 1];

			if (char === "*" && nextChar === "*") {
				// ** matches any path segments
				if (pattern[i + 2] === "/") {
					// **/
					regexStr += "(?:.*\\/)?";
					i += 3;
				} else {
					// ** at end or before non-slash
					regexStr += ".*";
					i += 2;
				}
			} else if (char === "*") {
				// * matches any characters except /
				regexStr += "[^\\/]*";
				i++;
			} else if (char === "?") {
				// ? matches any single character except /
				regexStr += "[^\\/]";
				i++;
			} else if (char === "[") {
				// Character class
				const endBracket = pattern.indexOf("]", i);
				if (endBracket === -1) {
					regexStr += "\\[";
					i++;
				} else {
					regexStr += pattern.slice(i, endBracket + 1);
					i = endBracket + 1;
				}
			} else if (char === "{") {
				// Brace expansion {a,b,c}
				const endBrace = pattern.indexOf("}", i);
				if (endBrace === -1) {
					regexStr += "\\{";
					i++;
				} else {
					const options = pattern.slice(i + 1, endBrace).split(",");
					regexStr += `(?:${options.map((o) => this.escapeRegex(o)).join("|")})`;
					i = endBrace + 1;
				}
			} else if ("^$.|+()\\".includes(char || "")) {
				// Escape regex special characters
				regexStr += `\\${char}`;
				i++;
			} else {
				regexStr += char;
				i++;
			}
		}

		return new RegExp(`^${regexStr}$`);
	}

	private escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	private normalizePath(path: string): string {
		// Handle Windows-style paths
		let normalized = path.replace(/\\/g, "/");

		// Remove trailing slashes (except for root)
		if (normalized.length > 1 && normalized.endsWith("/")) {
			normalized = normalized.slice(0, -1);
		}

		return normalized;
	}
}
