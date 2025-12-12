/**
 * GlobAdapter - Abstract interface for glob pattern matching
 *
 * This interface abstracts away the underlying glob implementation,
 * allowing the same business logic to run in different environments:
 * - Bun (uses Bun.Glob)
 * - Node.js (uses globby or fast-glob)
 * - Browser (uses in-memory file tree matching)
 * - Tests (uses in-memory implementation)
 */

export interface GlobOptions {
	/** The directory to search in */
	cwd: string;
	/** Whether to include dot files (default: false) */
	dot?: boolean;
	/** Whether to only return directories (default: false) */
	onlyDirectories?: boolean;
	/** Whether to only return files (default: true) */
	onlyFiles?: boolean;
	/** Patterns to ignore */
	ignore?: string[];
	/** Whether to follow symlinks (default: true) */
	followSymlinks?: boolean;
	/** Maximum depth to traverse (default: unlimited) */
	deep?: number;
}

export interface GlobAdapter {
	/**
	 * Scan for files matching a glob pattern
	 * @param pattern - Glob pattern (e.g., "*.md", "**\/*.ts")
	 * @param options - Glob options including cwd
	 * @returns Array of matching file paths relative to cwd
	 */
	scan(pattern: string, options: GlobOptions): Promise<string[]>;

	/**
	 * Synchronous version of scan (optional, not all environments support this)
	 */
	scanSync?(pattern: string, options: GlobOptions): string[];

	/**
	 * Check if a path matches a glob pattern
	 * @param pattern - Glob pattern to match against
	 * @param path - Path to test
	 * @returns Whether the path matches the pattern
	 */
	match?(pattern: string, path: string): boolean;
}
