/**
 * OTEL test utilities for capturing and exporting spans to JSON files.
 *
 * This module does NOT mock the tracer - it uses the real tracer from test-preload.ts.
 * It provides utilities to export captured spans to workflow JSON files for validation.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { trace } from "@opentelemetry/api";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// In-memory exporter to capture spans for JSON export
const memoryExporter = new InMemorySpanExporter();

// Track if we've added the memory exporter
let memoryProcessorAdded = false;

/**
 * Ensure the in-memory span processor is added to capture spans for export.
 * This is called automatically by exportTestSpans.
 */
function ensureMemoryProcessor() {
	if (memoryProcessorAdded) return;

	// Get the current provider and add our memory exporter
	const provider = trace.getTracerProvider();
	if (provider && "addSpanProcessor" in provider) {
		(provider as NodeTracerProvider).addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
		memoryProcessorAdded = true;
	}
}

/**
 * Convert captured spans to OTEL JSON format
 */
function spansToOtelJson(spans: ReturnType<typeof memoryExporter.getFinishedSpans>, scopeName: string) {
	return {
		resourceSpans: [
			{
				resource: {
					attributes: [
						{ key: "service.name", value: { stringValue: "backlog.md" } },
						{ key: "test.framework", value: { stringValue: "bun" } },
					],
				},
				scopeSpans: [
					{
						scope: {
							name: scopeName,
							version: "1.0.0",
						},
						spans: spans.map((span) => ({
							traceId: span.spanContext().traceId,
							spanId: span.spanContext().spanId,
							name: span.name,
							startTimeUnixNano: String(span.startTime[0] * 1_000_000_000 + span.startTime[1]),
							endTimeUnixNano: String(span.endTime[0] * 1_000_000_000 + span.endTime[1]),
							attributes: Object.entries(span.attributes).map(([key, value]) => ({
								key,
								value:
									typeof value === "string"
										? { stringValue: value }
										: typeof value === "number"
											? { intValue: value }
											: typeof value === "boolean"
												? { boolValue: value }
												: { stringValue: String(value) },
							})),
							events: span.events.map((event) => ({
								timeUnixNano: String(event.time[0] * 1_000_000_000 + event.time[1]),
								name: event.name,
								attributes: Object.entries(event.attributes || {}).map(([key, value]) => ({
									key,
									value:
										typeof value === "string"
											? { stringValue: value }
											: typeof value === "number"
												? { intValue: value }
												: typeof value === "boolean"
													? { boolValue: value }
													: value === undefined
														? { stringValue: "" }
														: { stringValue: String(value) },
								})),
							})),
							status: {
								code: span.status.code,
								message: span.status.message,
							},
						})),
					},
				],
			},
		],
	};
}

/**
 * Export current spans to a specific scenario file and clear the exporter.
 * @param workflowDir - Path to workflow directory (e.g., ".principal-views/draft-management/draft-workflow")
 * @param scenarioName - Name of the scenario (e.g., "promote-success-with-commit")
 * @param scopeName - OTEL scope name (e.g., "backlog.md")
 */
export async function exportTestSpans(workflowDir: string, scenarioName: string, scopeName: string) {
	ensureMemoryProcessor();

	const spans = memoryExporter.getFinishedSpans();

	if (spans.length === 0) {
		return;
	}

	// Ensure workflow directory exists
	const fullDir = join(process.cwd(), workflowDir);
	await mkdir(fullDir, { recursive: true });

	// Export to scenario-specific file
	const filename = `${scenarioName}.otel.json`;
	const filepath = join(fullDir, filename);

	const otelData = spansToOtelJson(spans, scopeName);
	await writeFile(filepath, JSON.stringify(otelData, null, "\t"));

	// Clear collected spans for next test
	memoryExporter.reset();
}

/**
 * Reset the in-memory exporter (useful for test cleanup)
 */
export function resetSpanExporter() {
	memoryExporter.reset();
}
