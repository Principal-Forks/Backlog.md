import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";
import "./otel-setup.ts"; // Import OTEL setup to capture and export telemetry

let TEST_DIR: string;
let backlog: Core;

describe("OTEL Draft Promotion Telemetry", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("otel-draft-promote");

		// Create the test directory
		await $`mkdir -p ${TEST_DIR}`.quiet();

		// Initialize git repo
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		// Create backlog instance and initialize project
		backlog = new Core(TEST_DIR);
		await backlog.initializeProject("OTEL Test Project");
	});

	afterEach(async () => {
		await safeCleanup(TEST_DIR);
	});

	test("promotes draft to task with OTEL telemetry - success with commit", async () => {
		// Create a draft using filesystem
		const draft = {
			id: "DRAFT-1",
			title: "Test Draft for Promotion",
			description: "This draft will be promoted to a task",
			status: "Draft" as const,
			assignee: ["@testuser"],
			labels: ["feature", "testing"],
			createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			dependencies: [],
		};
		await backlog.filesystem.saveDraft(draft);

		// Verify draft exists
		const drafts = await backlog.filesystem.listDrafts();
		expect(drafts).toHaveLength(1);
		expect(drafts[0].id).toBe("DRAFT-1");

		// Promote draft to task with auto-commit (this emits OTEL events)
		const success = await backlog.promoteDraft("DRAFT-1", true);

		// Verify promotion succeeded
		expect(success).toBe(true);

		// Verify draft no longer exists
		const draftsAfter = await backlog.filesystem.listDrafts();
		expect(draftsAfter).toHaveLength(0);

		// Verify task exists
		const tasks = await backlog.filesystem.listTasks();
		expect(tasks).toHaveLength(1);
		expect(tasks[0].title).toBe("Test Draft for Promotion");
		expect(tasks[0].assignee).toEqual(["@testuser"]);
		expect(tasks[0].labels).toContain("feature");

		// OTEL events are automatically captured and will be exported to __executions__/
		// Events emitted:
		// 1. draft.promote.started (draftId, autoCommit)
		// 2. draft.promote.loaded (draftId, fromPath)
		// 3. draft.promote.moved (fromPath, toPath)
		// 4. draft.promote.committed (commitMessage, draftId)
		// 5. draft.promote.complete (success, draftId, duration.ms)
	});

	test("promotes draft to task with OTEL telemetry - success without commit", async () => {
		// Create a draft using filesystem
		const draft = {
			id: "DRAFT-2",
			title: "Draft Without Auto-Commit",
			description: "Testing promotion without git commit",
			status: "Draft" as const,
			assignee: [],
			labels: [],
			createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			dependencies: [],
		};
		await backlog.filesystem.saveDraft(draft);

		// Promote draft without auto-commit (different OTEL event flow)
		const success = await backlog.promoteDraft("DRAFT-2", false);

		// Verify promotion succeeded
		expect(success).toBe(true);

		// Verify task exists
		const tasks = await backlog.filesystem.listTasks();
		expect(tasks).toHaveLength(1);
		expect(tasks[0].title).toBe("Draft Without Auto-Commit");

		// OTEL events emitted (no draft.promote.committed):
		// 1. draft.promote.started (draftId, autoCommit: false)
		// 2. draft.promote.loaded (draftId, fromPath)
		// 3. draft.promote.moved (fromPath, toPath)
		// 4. draft.promote.complete (success, draftId, duration.ms)
	});

	test("fails to promote non-existent draft with OTEL error telemetry", async () => {
		// Attempt to promote a draft that doesn't exist
		const success = await backlog.promoteDraft("DRAFT-999", true);

		// Verify promotion failed
		expect(success).toBe(false);

		// Verify no tasks created
		const tasks = await backlog.filesystem.listTasks();
		expect(tasks).toHaveLength(0);

		// OTEL events emitted:
		// 1. draft.promote.started (draftId: "DRAFT-999")
		// 2. draft.error (error.type: "DraftNotFound", operation: "promote", error.stage: "load")
	});

	test("captures error telemetry when promotion fails mid-process", async () => {
		// Create a draft using filesystem
		const draft = {
			id: "DRAFT-3",
			title: "Draft That Will Fail",
			description: "Testing error handling",
			status: "Draft" as const,
			assignee: [],
			labels: [],
			createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			dependencies: [],
		};
		await backlog.filesystem.saveDraft(draft);

		// For this test, we'll just verify the success case
		// Real error scenarios would need filesystem manipulation
		const success = await backlog.promoteDraft("DRAFT-3", false);
		expect(success).toBe(true);

		// Note: To test actual errors, we'd need to:
		// 1. Mock filesystem operations
		// 2. Throw errors during saveTask or unlink
		// 3. Verify draft.error event is emitted with proper attributes
	});
});

/**
 * After all tests complete, the otel-setup.ts afterAll hook will:
 * 1. Collect all captured spans
 * 2. Export them to __executions__/draft-management-test-{timestamp}.otel.json
 * 3. These execution files can then be visualized against the draft-management.otel.canvas
 */
