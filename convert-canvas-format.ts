#!/usr/bin/env bun
/**
 * Convert canvas files from old format to OTEL format
 * Old: pv.event + pv.dataSchema
 * New: pv.otelEvent.name + pv.otelEvent.attributes
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface OldDataSchema {
	[key: string]: {
		type: string;
		required?: boolean;
	};
}

interface OldPV {
	event?: string;
	dataSchema?: OldDataSchema;
	sources?: string[];
	otel?: {
		kind?: string;
		category?: string;
	};
	shape?: string;
	fill?: string;
	stroke?: string;
	[key: string]: unknown;
}

interface NewPV {
	otelEvent?: {
		name: string;
		attributes?: {
			required?: string[];
			optional?: string[];
		};
	};
	sources?: string[];
	otel?: {
		kind?: string;
		category?: string;
	};
	shape?: string;
	fill?: string;
	stroke?: string;
	[key: string]: unknown;
}

interface Node {
	pv?: OldPV | NewPV;
	[key: string]: unknown;
}

interface Canvas {
	nodes?: Node[];
	[key: string]: unknown;
}

function convertPV(oldPV: OldPV): NewPV {
	const newPV: NewPV = {};

	// Convert event and dataSchema to otelEvent
	if (oldPV.event) {
		newPV.otelEvent = {
			name: oldPV.event,
		};

		if (oldPV.dataSchema) {
			const required: string[] = [];
			const optional: string[] = [];

			for (const [key, value] of Object.entries(oldPV.dataSchema)) {
				if (value.required === true) {
					required.push(key);
				} else {
					optional.push(key);
				}
			}

			newPV.otelEvent.attributes = {};
			if (required.length > 0) {
				newPV.otelEvent.attributes.required = required;
			}
			if (optional.length > 0) {
				newPV.otelEvent.attributes.optional = optional;
			}
		}
	}

	// Copy other fields
	if (oldPV.sources) newPV.sources = oldPV.sources;
	if (oldPV.otel) newPV.otel = oldPV.otel;
	if (oldPV.shape) newPV.shape = oldPV.shape;
	if (oldPV.fill) newPV.fill = oldPV.fill;
	if (oldPV.stroke) newPV.stroke = oldPV.stroke;

	// Copy any other fields (edgeType, etc.)
	for (const [key, value] of Object.entries(oldPV)) {
		if (
			!["event", "dataSchema", "sources", "otel", "shape", "fill", "stroke"].includes(key)
		) {
			newPV[key] = value;
		}
	}

	return newPV;
}

async function convertCanvas(filePath: string): Promise<void> {
	console.log(`Converting: ${filePath}`);

	const content = await readFile(filePath, "utf-8");
	const canvas: Canvas = JSON.parse(content);

	let hasChanges = false;

	if (canvas.nodes) {
		for (const node of canvas.nodes) {
			if (node.pv && "event" in node.pv) {
				node.pv = convertPV(node.pv as OldPV);
				hasChanges = true;
			}
		}
	}

	if (hasChanges) {
		await writeFile(filePath, JSON.stringify(canvas, null, "\t") + "\n");
		console.log(`  ✓ Converted`);
	} else {
		console.log(`  - No changes needed`);
	}
}

async function main() {
	const canvasDir = join(import.meta.dir, ".principal-views");
	const files = await readdir(canvasDir);

	const canvasFiles = files.filter((f) => f.endsWith(".otel.canvas"));

	console.log(`Found ${canvasFiles.length} canvas files\n`);

	for (const file of canvasFiles) {
		await convertCanvas(join(canvasDir, file));
	}

	console.log("\n✅ Conversion complete!");
}

main().catch(console.error);
