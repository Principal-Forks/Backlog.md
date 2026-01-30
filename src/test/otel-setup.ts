import { afterAll } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type Context,
	context,
	ROOT_CONTEXT,
	type Span,
	type SpanContext,
	type SpanOptions,
	SpanStatusCode,
	type TimeInput,
	type Tracer,
	trace,
} from "@opentelemetry/api";

// Simple span collector for testing
interface CollectedSpan {
	name: string;
	traceId: string;
	spanId: string;
	startTime: number;
	endTime?: number;
	attributes: Record<string, any>;
	events: Array<{
		name: string;
		time: number;
		attributes: Record<string, any>;
	}>;
	status?: { code: number; message?: string };
}

class SimpleSpanCollector {
	spans: CollectedSpan[] = [];

	collectSpan(span: CollectedSpan) {
		this.spans.push(span);
	}

	getSpans() {
		return this.spans;
	}
}

const collector = new SimpleSpanCollector();

// Custom span that collects data
class CollectingSpan {
	private _name: string;
	private _traceId: string;
	private _spanId: string;
	private _startTime: number;
	private _endTime?: number;
	private _attributes: Record<string, any> = {};
	private _events: Array<{ name: string; time: number; attributes: Record<string, any> }> = [];
	private _status?: { code: number; message?: string };

	constructor(name: string) {
		this._name = name;
		this._traceId = Math.random().toString(16).slice(2);
		this._spanId = Math.random().toString(16).slice(2);
		this._startTime = Date.now();
	}

	spanContext(): SpanContext {
		return {
			traceId: this._traceId,
			spanId: this._spanId,
			traceFlags: 1,
		};
	}

	setAttribute(key: string, value: any): this {
		this._attributes[key] = value;
		return this;
	}

	setAttributes(attributes: Record<string, any>): this {
		Object.assign(this._attributes, attributes);
		return this;
	}

	addEvent(name: string, attributes?: Record<string, any> | TimeInput, time?: TimeInput): this {
		const eventAttrs = typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {};
		this._events.push({
			name,
			time: Date.now(),
			attributes: eventAttrs,
		});
		return this;
	}

	setStatus(status: { code: number; message?: string }): this {
		this._status = status;
		return this;
	}

	updateName(name: string): this {
		this._name = name;
		return this;
	}

	end(endTime?: TimeInput): void {
		this._endTime = Date.now();
		collector.collectSpan({
			name: this._name,
			traceId: this._traceId,
			spanId: this._spanId,
			startTime: this._startTime,
			endTime: this._endTime,
			attributes: this._attributes,
			events: this._events,
			status: this._status,
		});
	}

	isRecording(): boolean {
		return !this._endTime;
	}

	recordException(exception: Error | string, time?: TimeInput): void {
		this.addEvent("exception", {
			"exception.message": typeof exception === "string" ? exception : exception.message,
			"exception.type": typeof exception === "string" ? "Error" : exception.constructor.name,
		});
	}
}

// Custom tracer that creates collecting spans
class CollectingTracer {
	startSpan(name: string, options?: SpanOptions, context?: any): Span {
		return new CollectingSpan(name) as unknown as Span;
	}

	startActiveSpan(...args: any[]): any {
		const name = args[0];
		const callback = args[args.length - 1];
		const span = new CollectingSpan(name) as unknown as Span;
		try {
			return callback(span);
		} finally {
			span.end();
		}
	}
}

// Override the global tracer
const collectingTracer = new CollectingTracer();
trace.getTracer = () => collectingTracer as unknown as Tracer;

// Track active spans via context
let activeSpanStack: Span[] = [];
trace.getActiveSpan = () => activeSpanStack[activeSpanStack.length - 1];

// Symbol to store span in context
const SPAN_KEY = Symbol("otel-span");

// Override trace.setSpan to create a context with the span
const originalSetSpan = trace.setSpan;
trace.setSpan = (ctx: Context, span: Span): Context => {
	// Create a mock context that carries the span
	return { ...ctx, [SPAN_KEY]: span } as unknown as Context;
};

// Override context.with to properly track active span during callback
const originalWith = context.with;
context.with = <A extends unknown[], F extends (...args: A) => ReturnType<F>>(
	ctx: Context,
	fn: F,
	thisArg?: ThisParameterType<F>,
	...args: A
): ReturnType<F> => {
	const span = (ctx as any)[SPAN_KEY] as Span | undefined;
	if (span) {
		activeSpanStack.push(span);
	}
	try {
		return fn.apply(thisArg, args);
	} finally {
		if (span) {
			activeSpanStack.pop();
		}
	}
};

/**
 * Start a test span for capturing OTEL events
 */
export function startTestSpan(name: string): Span {
	const span = collectingTracer.startSpan(name);
	activeSpanStack.push(span);
	return span;
}

/**
 * Get the active tracer for manual instrumentation
 */
export function getTracer(): Tracer {
	return collectingTracer as unknown as Tracer;
}

/**
 * Add an event to a span with attributes
 */
export function addEvent(span: Span, eventName: string, attributes: Record<string, any>) {
	span.addEvent(eventName, attributes);
}

/**
 * Complete a span successfully
 */
export function completeSpan(span: Span, attributes?: Record<string, any>) {
	if (attributes) {
		span.setAttributes(attributes);
	}
	span.setStatus({ code: SpanStatusCode.OK });
	span.end();
	activeSpanStack = activeSpanStack.filter((s) => s !== span);
}

/**
 * Complete a span with an error
 */
export function completeSpanWithError(span: Span, error: Error, attributes?: Record<string, any>) {
	if (attributes) {
		span.setAttributes(attributes);
	}
	span.setStatus({
		code: SpanStatusCode.ERROR,
		message: error.message,
	});
	span.recordException(error);
	span.end();
	activeSpanStack = activeSpanStack.filter((s) => s !== span);
}

/**
 * Convert collected spans to OTEL JSON format
 */
function spansToOtelJson(spans: CollectedSpan[], scopeName: string) {
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
							traceId: span.traceId,
							spanId: span.spanId,
							name: span.name,
							startTimeUnixNano: String(span.startTime * 1_000_000),
							endTimeUnixNano: span.endTime ? String(span.endTime * 1_000_000) : String(Date.now() * 1_000_000),
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
								timeUnixNano: String(event.time * 1_000_000),
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
							status: span.status,
						})),
					},
				],
			},
		],
	};
}

/**
 * Export current spans to a specific scenario file and clear the collector
 * @param workflowDir - Path to workflow directory (e.g., ".principal-views/draft-management/draft-workflow")
 * @param scenarioName - Name of the scenario (e.g., "promote-success-with-commit")
 * @param scopeName - OTEL scope name (e.g., "backlog-draft-management")
 */
export async function exportTestSpans(workflowDir: string, scenarioName: string, scopeName: string) {
	const spans = collector.getSpans();

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
	collector.spans.length = 0;
}
