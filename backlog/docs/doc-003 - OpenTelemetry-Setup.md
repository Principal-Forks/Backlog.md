# OpenTelemetry Setup

This document describes the telemetry infrastructure for Backlog.md.

## Overview

Backlog.md uses OpenTelemetry for distributed tracing. The implementation follows a library instrumentation pattern where the core library only depends on `@opentelemetry/api` (lightweight), leaving the concrete provider setup to the consuming application or test environment.

## Architecture

### Core Module (`src/telemetry.ts`)

Provides a centralized tracer accessor:

```typescript
import { getTracer } from "./telemetry";

const tracer = getTracer();
const span = tracer.startSpan("operation.name");
```

Exports:
- `getTracer()` - Returns the tracer from the global provider
- `TRACER_NAME` - "backlog.md"
- `TRACER_VERSION` - From package.json

### Test Preload (`src/test-preload.ts`)

Configures the OTEL provider during test runs when `OTEL_ENABLED=true`. Uses:
- `NodeTracerProvider` with `SimpleSpanProcessor` for immediate export
- `OTLPTraceExporter` sending to HTTP endpoint

## Running Tests with Telemetry

```bash
# Start an OTEL collector (e.g., Jaeger)
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Run tests with telemetry enabled
OTEL_ENABLED=true bun test

# Or use the npm script
bun run test:otel
```

View traces at http://localhost:16686

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_ENABLED` | `false` | Set to "true" to enable telemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Collector HTTP endpoint |
| `OTEL_SERVICE_NAME` | `backlog.md` | Service name for spans |

## Instrumented Operations

### Draft Promotion (`draft.promote`)

Span events:
- `draft.promote.started` - Promotion initiated
- `draft.promote.loaded` - Draft located
- `draft.promote.moved` - File moved to tasks
- `draft.promote.committed` - Git commit created (if autoCommit)
- `draft.promote.complete` - Operation finished
- `draft.error` - Error occurred

## Test Utilities (`src/test/otel-setup.ts`)

For tests that need to export spans to JSON files:

```typescript
import { exportTestSpans } from "./otel-setup";

// After test operations complete
await exportTestSpans(
  ".principal-views/workflow-dir",
  "scenario-name",
  "backlog.md"
);
```

This exports captured spans to `{workflow-dir}/{scenario-name}.otel.json`.
