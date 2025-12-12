/**
 * MockGitAdapter - Configurable mock for testing git operations
 *
 * Allows setting up expected responses for git commands and tracks
 * all operations for assertions in tests.
 */

import type { GitAdapter, GitExecOptions, GitExecResult } from "../pure-core/abstractions/GitAdapter.ts";

export interface MockGitCommand {
	args: string[];
	options?: GitExecOptions;
}

export interface MockGitResponse {
	stdout?: string;
	stderr?: string;
	exitCode?: number;
	error?: Error;
}

export interface MockGitMatcher {
	/** Match specific args (exact match) */
	args?: string[];
	/** Match args starting with these values */
	argsStartWith?: string[];
	/** Match if args contain this value */
	argsContain?: string;
	/** Custom matcher function */
	match?: (args: string[], options?: GitExecOptions) => boolean;
}

export interface MockGitRule {
	matcher: MockGitMatcher;
	response: MockGitResponse;
	/** If true, remove this rule after it's matched once */
	once?: boolean;
}

export class MockGitAdapter implements GitAdapter {
	readonly projectRoot: string;

	private rules: MockGitRule[] = [];
	private executedCommands: MockGitCommand[] = [];
	private isRepo = true;
	private defaultResponse: MockGitResponse = { stdout: "", stderr: "", exitCode: 0 };

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
	}

	/**
	 * Configure whether this is treated as a git repository
	 */
	setIsRepository(isRepo: boolean): this {
		this.isRepo = isRepo;
		return this;
	}

	/**
	 * Set the default response for unmatched commands
	 */
	setDefaultResponse(response: MockGitResponse): this {
		this.defaultResponse = response;
		return this;
	}

	/**
	 * Add a mock rule for specific git commands
	 */
	addRule(matcher: MockGitMatcher, response: MockGitResponse, once = false): this {
		this.rules.push({ matcher, response, once });
		return this;
	}

	/**
	 * Shorthand: mock a specific command (exact args match)
	 */
	mockCommand(args: string[], response: MockGitResponse, once = false): this {
		return this.addRule({ args }, response, once);
	}

	/**
	 * Shorthand: mock commands starting with specific args
	 */
	mockCommandStartingWith(argsStart: string[], response: MockGitResponse, once = false): this {
		return this.addRule({ argsStartWith: argsStart }, response, once);
	}

	/**
	 * Shorthand: mock commands containing a specific arg
	 */
	mockCommandContaining(argValue: string, response: MockGitResponse, once = false): this {
		return this.addRule({ argsContain: argValue }, response, once);
	}

	/**
	 * Set up common mocks for a typical git repository
	 */
	setupCommonMocks(): this {
		// Status - clean
		this.mockCommandStartingWith(["status"], { stdout: "", exitCode: 0 });
		// Branch - main
		this.mockCommand(["branch", "--show-current"], { stdout: "main\n", exitCode: 0 });
		this.mockCommand(["rev-parse", "--abbrev-ref", "HEAD"], { stdout: "main\n", exitCode: 0 });
		// Remote - none by default
		this.mockCommand(["remote"], { stdout: "", exitCode: 0 });
		// Log
		this.mockCommandStartingWith(["log"], { stdout: "", exitCode: 0 });
		// Config
		this.mockCommandStartingWith(["config"], { stdout: "", exitCode: 0 });
		return this;
	}

	/**
	 * Clear all rules and recorded commands
	 */
	reset(): this {
		this.rules = [];
		this.executedCommands = [];
		this.isRepo = true;
		this.defaultResponse = { stdout: "", stderr: "", exitCode: 0 };
		return this;
	}

	/**
	 * Clear only the recorded commands (keep rules)
	 */
	clearHistory(): this {
		this.executedCommands = [];
		return this;
	}

	/**
	 * Get all executed commands for assertions
	 */
	getExecutedCommands(): MockGitCommand[] {
		return [...this.executedCommands];
	}

	/**
	 * Check if a specific command was executed
	 */
	wasExecuted(args: string[]): boolean {
		return this.executedCommands.some(
			(cmd) => cmd.args.length === args.length && cmd.args.every((arg, i) => arg === args[i]),
		);
	}

	/**
	 * Check if any command starting with these args was executed
	 */
	wasExecutedStartingWith(argsStart: string[]): boolean {
		return this.executedCommands.some(
			(cmd) => cmd.args.length >= argsStart.length && argsStart.every((arg, i) => cmd.args[i] === arg),
		);
	}

	/**
	 * Get the count of times a command was executed
	 */
	getExecutionCount(args: string[]): number {
		return this.executedCommands.filter(
			(cmd) => cmd.args.length === args.length && cmd.args.every((arg, i) => arg === args[i]),
		).length;
	}

	// GitAdapter implementation

	async exec(args: string[], options?: GitExecOptions): Promise<GitExecResult> {
		// Record the command
		this.executedCommands.push({ args: [...args], options });

		// Find matching rule
		const rule = this.rules.find((r) => this.matchesRule(r.matcher, args, options));

		if (rule) {
			const response = rule.response;

			// Remove one-time rules
			if (rule.once) {
				const index = this.rules.indexOf(rule);
				if (index !== -1) {
					this.rules.splice(index, 1);
				}
			}

			// Handle error response
			if (response.error) {
				throw response.error;
			}

			return {
				stdout: response.stdout ?? "",
				stderr: response.stderr ?? "",
				exitCode: response.exitCode ?? 0,
			};
		}

		// Use default response
		if (this.defaultResponse.error) {
			throw this.defaultResponse.error;
		}

		return {
			stdout: this.defaultResponse.stdout ?? "",
			stderr: this.defaultResponse.stderr ?? "",
			exitCode: this.defaultResponse.exitCode ?? 0,
		};
	}

	async isGitRepository(_path: string): Promise<boolean> {
		return this.isRepo;
	}

	async initRepository(_path: string): Promise<void> {
		this.isRepo = true;
		this.executedCommands.push({ args: ["init"] });
	}

	private matchesRule(matcher: MockGitMatcher, args: string[], options?: GitExecOptions): boolean {
		// Custom matcher takes precedence
		if (matcher.match) {
			return matcher.match(args, options);
		}

		// Exact args match
		if (matcher.args) {
			if (args.length !== matcher.args.length || !matcher.args.every((arg, i) => arg === args[i])) {
				return false;
			}
		}

		// Args start with match
		if (matcher.argsStartWith) {
			if (args.length < matcher.argsStartWith.length || !matcher.argsStartWith.every((arg, i) => arg === args[i])) {
				return false;
			}
		}

		// Args contain match
		if (matcher.argsContain !== undefined) {
			if (!args.includes(matcher.argsContain)) {
				return false;
			}
		}

		return true;
	}
}
