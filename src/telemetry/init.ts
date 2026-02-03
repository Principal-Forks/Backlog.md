import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

let provider: NodeTracerProvider | null = null;
let isInitialized = false;

/**
 * Default OTLP endpoint for traces
 */
const DEFAULT_OTLP_ENDPOINT = "http://localhost:4319/v1/traces";

/**
 * Configuration for OpenTelemetry initialization
 */
export interface OTelConfig {
	/** OTLP endpoint URL (defaults to 'http://localhost:4319/v1/traces') */
	endpoint?: string;
	/** Whether to enable telemetry (defaults to true) */
	enabled?: boolean;
	/** Service name for traces (defaults to 'backlog-cli') */
	serviceName?: string;
}

/**
 * Initialize OpenTelemetry tracing with SimpleSpanProcessor for immediate export
 *
 * Telemetry is enabled by default and sends to http://localhost:4319/v1/traces
 *
 * Environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Collector endpoint URL (defaults to http://localhost:4319/v1/traces)
 * - OTEL_ENABLED: Set to 'false' to disable telemetry
 * - OTEL_SERVICE_NAME: Service name (defaults to 'backlog-cli')
 */
export function initializeTelemetry(config: OTelConfig = {}): void {
	// Don't reinitialize if already done
	if (isInitialized) {
		return;
	}

	// Check if telemetry is enabled
	const envEnabled = process.env.OTEL_ENABLED?.toLowerCase() !== "false";
	const configEnabled = config.enabled ?? true;
	const endpoint = config.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? DEFAULT_OTLP_ENDPOINT;

	// Only initialize if enabled
	if (!envEnabled || !configEnabled) {
		return;
	}

	try {
		// Create OTLP exporter
		const exporter = new OTLPTraceExporter({
			url: endpoint,
		});

		// Create resource with service name
		const resource = resourceFromAttributes({
			"service.name": config.serviceName ?? process.env.OTEL_SERVICE_NAME ?? "backlog-cli",
		});

		// Create provider with SimpleSpanProcessor for immediate export (not batched)
		provider = new NodeTracerProvider({
			resource,
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		});

		// Register the provider globally
		provider.register();

		isInitialized = true;

		// Debug: Log that telemetry was initialized
		if (process.env.DEBUG_OTEL) {
			console.error(`[OTEL] Initialized with endpoint: ${endpoint}`);
		}
	} catch (error) {
		console.error("Failed to initialize OpenTelemetry:", error);
	}
}

/**
 * Shutdown telemetry and flush any remaining spans
 * Should be called before process exit
 */
export async function shutdownTelemetry(): Promise<void> {
	if (provider) {
		try {
			if (process.env.DEBUG_OTEL) {
				console.error("[OTEL] Flushing and shutting down...");
			}
			await provider.forceFlush();
			await provider.shutdown();
			if (process.env.DEBUG_OTEL) {
				console.error("[OTEL] Shutdown complete");
			}
		} catch (error) {
			console.error("Error during telemetry shutdown:", error);
		}
	} else {
		if (process.env.DEBUG_OTEL) {
			console.error("[OTEL] Shutdown called but provider not initialized");
		}
	}
}

/**
 * Check if telemetry is initialized
 */
export function isTelemetryInitialized(): boolean {
	return isInitialized;
}

/**
 * Get the global tracer provider (for testing)
 */
export function getTracerProvider(): NodeTracerProvider | null {
	return provider;
}
