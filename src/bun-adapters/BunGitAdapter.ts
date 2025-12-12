/**
 * BunGitAdapter - Bun-specific implementation of GitAdapter
 *
 * Uses Bun.spawn for executing git commands with optimal performance.
 */

import type { GitAdapter, GitExecOptions, GitExecResult } from "../pure-core/abstractions/GitAdapter.ts";

export class BunGitAdapter implements GitAdapter {
	readonly projectRoot: string;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
	}

	async exec(args: string[], options?: GitExecOptions): Promise<GitExecResult> {
		const cwd = options?.cwd ?? this.projectRoot;

		// Build environment with optional GIT_OPTIONAL_LOCKS for read-only operations
		const env = options?.readOnly
			? { ...process.env, ...options?.env, GIT_OPTIONAL_LOCKS: "0" }
			: { ...process.env, ...options?.env };

		const subprocess = Bun.spawn(["git", ...args], {
			cwd,
			stdin: "ignore", // Avoid inheriting MCP stdio pipes which can block on Windows
			stdout: "pipe",
			stderr: "pipe",
			env: env as Record<string, string>,
		});

		const stdoutPromise = subprocess.stdout ? new Response(subprocess.stdout).text() : Promise.resolve("");
		const stderrPromise = subprocess.stderr ? new Response(subprocess.stderr).text() : Promise.resolve("");
		const [exitCode, stdout, stderr] = await Promise.all([subprocess.exited, stdoutPromise, stderrPromise]);

		if (exitCode !== 0) {
			const error = new Error(`Git command failed (exit code ${exitCode}): git ${args.join(" ")}\n${stderr}`);
			(error as GitExecError).exitCode = exitCode;
			(error as GitExecError).stdout = stdout;
			(error as GitExecError).stderr = stderr;
			throw error;
		}

		return { stdout, stderr, exitCode };
	}

	async isGitRepository(path: string): Promise<boolean> {
		try {
			await this.exec(["rev-parse", "--git-dir"], { cwd: path, readOnly: true });
			return true;
		} catch {
			return false;
		}
	}

	async initRepository(path: string): Promise<void> {
		await this.exec(["init"], { cwd: path });
	}
}

/**
 * Extended error type for git command failures
 */
export interface GitExecError extends Error {
	exitCode: number;
	stdout: string;
	stderr: string;
}

/**
 * Type guard to check if an error is a GitExecError
 */
export function isGitExecError(error: unknown): error is GitExecError {
	return (
		error instanceof Error &&
		typeof (error as GitExecError).exitCode === "number" &&
		typeof (error as GitExecError).stdout === "string" &&
		typeof (error as GitExecError).stderr === "string"
	);
}
