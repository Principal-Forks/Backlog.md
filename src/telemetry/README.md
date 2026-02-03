# OpenTelemetry Instrumentation

This directory contains the OpenTelemetry (OTEL) instrumentation for the Backlog CLI.

## Overview

The CLI uses OpenTelemetry to emit traces for instrumented operations. **Telemetry is enabled by default** and sends traces to `http://localhost:4319/v1/traces`. Traces are exported immediately using `SimpleSpanProcessor` when a CLI command completes.

## Configuration

### Environment Variables

- **`OTEL_EXPORTER_OTLP_ENDPOINT`**: The OTLP collector endpoint URL
  - Default: `http://localhost:4319/v1/traces`
  - Override to send to a different collector

- **`OTEL_ENABLED`**: Enable/disable telemetry
  - Values: `true` (default) or `false`
  - Set to `false` to disable telemetry

- **`OTEL_SERVICE_NAME`**: Service name for traces
  - Default: `backlog-cli`

### Example Usage

```bash
# Use default configuration (sends to localhost:4319)
backlog task list

# Disable telemetry
export OTEL_ENABLED=false
backlog task list

# Custom collector endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4319/v1/traces
backlog task list

# Custom service name
export OTEL_SERVICE_NAME=my-backlog-instance
backlog task list
```

## How It Works

1. **Initialization** (`src/telemetry/init.ts`)
   - Called at CLI startup in `src/cli.ts`
   - Checks if telemetry is enabled and endpoint is configured
   - Creates `NodeTracerProvider` with `SimpleSpanProcessor`
   - Registers global tracer provider

2. **Instrumentation** (throughout codebase)
   - Operations create spans using `trace.getTracer()`
   - Spans are enriched with attributes and events
   - Example: `promoteDraft()` in `src/core/backlog.ts`

3. **Export**
   - `SimpleSpanProcessor` exports spans **immediately** when `span.end()` is called
   - No batching or buffering (unlike `BatchSpanProcessor`)
   - Ensures traces are sent before CLI command completes

4. **Shutdown** (`src/cli.ts`)
   - Called in `finally` block after command completes
   - Flushes any remaining spans
   - Gracefully shuts down tracer provider

## Span Processor: SimpleSpanProcessor vs BatchSpanProcessor

We use **`SimpleSpanProcessor`** instead of `BatchSpanProcessor` because:

- **Immediate Export**: CLI commands are short-lived; we need to export before the process exits
- **No Buffering**: Traces are sent synchronously when spans end
- **Guaranteed Delivery**: Shutdown hook ensures all spans are flushed before exit

`BatchSpanProcessor` would be inappropriate for a CLI tool because it:
- Buffers spans for batch export (every ~5 seconds)
- May lose traces if process exits before batch is sent
- Is designed for long-running processes (servers, daemons)

## Testing

The test setup (`src/test/otel-setup.ts`) uses a **mock tracer** for testing:
- Overrides global tracer with custom collector
- Captures spans in-memory for verification
- Exports spans to `.otel.json` files for documentation
- **Does not use production telemetry configuration**

Test and production telemetry systems are completely independent.

## Adding Instrumentation to New Operations

To add OTEL instrumentation to a new operation:

```typescript
import { trace } from "@opentelemetry/api";

// Get a tracer with a descriptive scope name
const tracer = trace.getTracer("backlog-feature-name");

// Start a span for the operation
const span = tracer.startSpan("operation.name");

try {
  // Add attributes to provide context
  span.setAttribute("operation.id", operationId);
  span.setAttribute("operation.type", "create");

  // Add events for significant milestones
  span.addEvent("operation.started", {
    "started.at": new Date().toISOString(),
  });

  // Perform the operation
  const result = await performOperation();

  // Add success event
  span.addEvent("operation.completed", {
    "result.id": result.id,
  });

  return result;
} catch (error) {
  // Record the error
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  throw error;
} finally {
  // Always end the span
  span.end();
}
```

## Architecture

```
CLI Entry Point (src/cli.ts)
  ↓
Initialize Telemetry (src/telemetry/init.ts)
  ↓
Register Global TracerProvider
  ↓
Instrumented Operations (src/core/*.ts, etc.)
  → Create Spans
  → Add Events/Attributes
  → End Spans → SimpleSpanProcessor → OTLP Exporter → Collector
  ↓
Command Completes
  ↓
Shutdown Telemetry (flush remaining spans)
```

## Troubleshooting

### No traces appearing in collector

1. **Verify collector is running** on `localhost:4319` (or your custom endpoint)
2. Check that `OTEL_ENABLED` is not set to `false`
3. If using a custom endpoint, verify `OTEL_EXPORTER_OTLP_ENDPOINT` is correct
4. Look for errors in CLI output (initialization failures are logged to stderr)

### Traces are incomplete

- Ensure all spans call `span.end()`
- Check that CLI shutdown logic runs (not interrupted by SIGKILL)
- Verify no unhandled exceptions prevent span completion
