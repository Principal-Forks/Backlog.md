/**
 * Abstract interfaces for environment-agnostic operations
 *
 * These interfaces define the contracts that environment-specific
 * adapters must implement. By depending on these interfaces instead
 * of concrete implementations, the core business logic can run in
 * any environment (Bun, Node.js, browser, tests).
 */

export type { FileStats, FileSystemAdapter } from "./FileSystemAdapter.ts";
export type { GitAdapter, GitExecOptions, GitExecResult, GitOperationsInterface } from "./GitAdapter.ts";
export type { GlobAdapter, GlobOptions } from "./GlobAdapter.ts";
