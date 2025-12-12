/**
 * Test Adapters - In-memory implementations for testing
 *
 * These adapters allow unit tests to run without touching the actual
 * filesystem or requiring a git repository. They provide fast, isolated
 * testing with full control over the environment.
 *
 * Usage:
 * ```typescript
 * import {
 *   InMemoryFileSystemAdapter,
 *   InMemoryGlobAdapter,
 *   MockGitAdapter
 * } from 'backlog.md/test-adapters';
 *
 * const fs = new InMemoryFileSystemAdapter();
 * const glob = new InMemoryGlobAdapter(fs);
 * const git = new MockGitAdapter('/test/repo').setupCommonMocks();
 *
 * const core = new Core('/test/repo', {
 *   adapters: { fs, glob, git }
 * });
 * ```
 */

export { InMemoryFileSystemAdapter } from "./InMemoryFileSystemAdapter.ts";
export { InMemoryGlobAdapter } from "./InMemoryGlobAdapter.ts";
export {
	MockGitAdapter,
	type MockGitCommand,
	type MockGitMatcher,
	type MockGitResponse,
	type MockGitRule,
} from "./MockGitAdapter.ts";

/**
 * Helper to create a complete set of test adapters
 */
export function createTestAdapters(projectRoot: string) {
	const { InMemoryFileSystemAdapter } = require("./InMemoryFileSystemAdapter.ts");
	const { InMemoryGlobAdapter } = require("./InMemoryGlobAdapter.ts");
	const { MockGitAdapter } = require("./MockGitAdapter.ts");

	const fs = new InMemoryFileSystemAdapter();
	const glob = new InMemoryGlobAdapter(fs);
	const git = new MockGitAdapter(projectRoot).setupCommonMocks();

	// Set up the project root directory
	fs.setupTestRepo(projectRoot);

	return { fs, glob, git };
}
