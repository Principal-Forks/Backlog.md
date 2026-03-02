/**
 * Manual OTEL test that bypasses the mock in otel-setup.ts
 * Run with: OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 OTEL_ENABLED=true bun run src/test/otel-manual-test.ts
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";

async function main() {
	// Create temp directory
	const TEST_DIR = join(tmpdir(), `otel-test-${Date.now()}`);
	await $`mkdir -p ${TEST_DIR}`.quiet();

	// Initialize git repo
	await $`git init -b main`.cwd(TEST_DIR).quiet();
	await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
	await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

	// Create backlog instance and initialize project
	const backlog = new Core(TEST_DIR);
	await backlog.initializeProject("OTEL Test Project");

	// Create a draft
	const draft = {
		id: "DRAFT-1",
		title: "Test Draft for OTEL",
		description: "Testing telemetry",
		status: "Draft" as const,
		assignee: [] as string[],
		labels: [] as string[],
		createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
		dependencies: [] as string[],
	};
	await backlog.filesystem.saveDraft(draft);
	console.log("Draft created");

	// Promote draft (this should emit OTEL spans)
	const success = await backlog.promoteDraft("DRAFT-1", false);
	console.log("Promote result:", success);

	// Cleanup
	await $`rm -rf ${TEST_DIR}`.quiet();
	console.log("Done!");

	// Wait for flush
	await new Promise((r) => setTimeout(r, 1000));
}

main().catch(console.error);
