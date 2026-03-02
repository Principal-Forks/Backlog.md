/**
 * Test preload for OpenTelemetry configuration
 *
 * This file is loaded before tests run (via bunfig.toml preload)
 * and sets up the OpenTelemetry tracer provider to send spans
 * to an OTEL collector during test runs.
 *
 * Environment variables:
 * - OTEL_ENABLED: Set to "true" to enable telemetry (default: disabled)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Collector endpoint (default: http://localhost:4318)
 * - OTEL_SERVICE_NAME: Service name for spans (default: backlog.md-tests)
 */

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { TRACER_NAME, TRACER_VERSION } from "./telemetry";

const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";

if (OTEL_ENABLED) {
	const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
	const serviceName = process.env.OTEL_SERVICE_NAME || "backlog.md";

	const resource = resourceFromAttributes({
		"service.name": serviceName,
		"service.version": TRACER_VERSION,
		"telemetry.sdk.language": "typescript",
		"telemetry.sdk.name": TRACER_NAME,
	});

	// OTLPTraceExporter expects the full URL including /v1/traces path
	// If the endpoint already has the path, use it as-is; otherwise append it
	const traceUrl = endpoint.includes("/v1/traces") ? endpoint : `${endpoint}/v1/traces`;

	const exporter = new OTLPTraceExporter({
		url: traceUrl,
		headers: {
			"Content-Type": "application/json",
		},
	});

	// Use SimpleSpanProcessor for immediate export during tests
	// (BatchSpanProcessor may not flush before test process exits)
	const provider = new NodeTracerProvider({
		resource,
		spanProcessors: [new SimpleSpanProcessor(exporter)],
	});

	provider.register();

	// Register shutdown handler for graceful cleanup
	const shutdown = async () => {
		await provider.shutdown();
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	console.log(`[OTEL] Telemetry enabled, sending to ${traceUrl}`);
}
