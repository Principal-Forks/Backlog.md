/**
 * GitAdapter - Abstract interface for Git operations
 *
 * This interface abstracts away the underlying git implementation,
 * allowing the same business logic to run in different environments:
 * - Bun (BunGitAdapter - uses Bun.spawn)
 * - Node.js (NodeGitAdapter - uses child_process)
 * - Browser (IsomorphicGitAdapter - uses isomorphic-git library)
 * - Tests (MockGitAdapter - configurable mock responses)
 */

export interface GitExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface GitExecOptions {
	/** Whether this is a read-only operation (can use GIT_OPTIONAL_LOCKS=0) */
	readOnly?: boolean;
	/** Working directory for the command */
	cwd?: string;
	/** Environment variables to pass */
	env?: Record<string, string>;
}

/**
 * Low-level git command executor
 * This is the core abstraction - higher-level operations are built on top
 */
export interface GitAdapter {
	/**
	 * Execute a git command with the given arguments
	 * @param args - Git command arguments (e.g., ["status", "--porcelain"])
	 * @param options - Execution options
	 * @returns Command output
	 * @throws Error if the command fails (non-zero exit code)
	 */
	exec(args: string[], options?: GitExecOptions): Promise<GitExecResult>;

	/**
	 * Check if we're in a git repository
	 */
	isGitRepository(path: string): Promise<boolean>;

	/**
	 * Initialize a new git repository
	 */
	initRepository(path: string): Promise<void>;

	/**
	 * The project root this adapter operates on
	 */
	readonly projectRoot: string;
}

/**
 * High-level git operations interface
 * These are convenience methods built on top of GitAdapter.exec()
 * The GitOperations class implements these using a GitAdapter
 */
export interface GitOperationsInterface {
	// File staging
	addFile(filePath: string): Promise<void>;
	addFiles(filePaths: string[]): Promise<void>;
	stageBacklogDirectory(backlogDir?: string): Promise<void>;
	stageFileMove(fromPath: string, toPath: string): Promise<void>;

	// Commits
	commitChanges(message: string): Promise<void>;
	commitStagedChanges(message: string): Promise<void>;
	commitTaskChange(taskId: string, message: string): Promise<void>;
	addAndCommitTaskFile(taskId: string, filePath: string, action: "create" | "update" | "archive"): Promise<void>;
	resetIndex(): Promise<void>;

	// Status queries
	getStatus(): Promise<string>;
	isClean(): Promise<boolean>;
	hasUncommittedChanges(): Promise<boolean>;
	getLastCommitMessage(): Promise<string>;

	// Branch operations
	getCurrentBranch(): Promise<string>;
	listLocalBranches(): Promise<string[]>;
	listAllBranches(remote?: string): Promise<string[]>;
	listRemoteBranches(remote?: string): Promise<string[]>;
	listRecentBranches(daysAgo: number): Promise<string[]>;
	listRecentRemoteBranches(daysAgo: number, remote?: string): Promise<string[]>;

	// Remote operations
	hasAnyRemote(): Promise<boolean>;
	hasRemote(remote?: string): Promise<boolean>;
	fetch(remote?: string): Promise<void>;

	// File inspection across branches
	listFilesInTree(ref: string, path: string): Promise<string[]>;
	showFile(ref: string, filePath: string): Promise<string>;
	getBranchLastModifiedMap(ref: string, dir: string, sinceDays?: number): Promise<Map<string, Date>>;
	getFileLastModifiedBranch(filePath: string): Promise<string | null>;
}
