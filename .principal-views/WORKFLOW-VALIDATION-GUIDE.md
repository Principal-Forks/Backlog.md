# Workflow Validation Guide

Lessons learned from fixing draft-management workflows. Apply these patterns to remaining canvas files.

## Goal

**Instrument existing code to surface what test coverage currently covers vs expected behavior.**

- Add telemetry to existing code paths (don't change behavior)
- Capture what tests are exercising via OTEL spans/events
- Compare against expected scenarios defined in workflows
- **Not adding new tests** - just visibility into existing coverage

The workflows define expected behavior. The instrumentation captures actual behavior. The gap shows what's untested.

## Workflow File Format

### Scenario Structure

Scenarios **must not** use a `match` field. Matching is based solely on `template.events` keys.

```json
{
  "id": "success-with-commit",
  "priority": 1,
  "template": {
    "summary": "Operation completed with commit",
    "events": {
      "operation.started": "Starting {{id}}",
      "operation.committed": "Committed: {{message}}",
      "operation.complete": "Done in {{duration.ms}}ms"
    }
  },
  "description": "Human-readable description"
}
```

**Invalid fields:**
- `match` - not supported
- `match.events` - not supported
- `match.attributes` - not supported
- `excludeEvents` - not supported

### Making Scenarios Mutually Exclusive

If two scenarios would otherwise be subsets of each other, add a distinguishing event to each.

**Problem:**
- `success-with-commit`: [started, committed, complete]
- `success-no-commit`: [started, complete] ← subset of above

**Solution:** Add a `commit-skipped` event when autoCommit is false:
- `success-with-commit`: [started, committed, complete]
- `success-no-commit`: [started, commit-skipped, complete] ← no longer a subset

### Fallback Scenarios

**Don't use fallback scenarios.** They cause "subset of fallback" validation errors because fallback contains all events.

If you have well-defined scenarios covering all expected paths, fallback is unnecessary.

## Canvas Requirements

### Every Event Needs Edges

Events referenced in workflows must be connected in the canvas flow. "Disconnected event" errors mean the event node has no incoming/outgoing edges.

For each event node, ensure:
1. There's an edge **to** it from the previous step
2. There's an edge **from** it to the next step (or error node)

### Node Status and Files

Nodes with `status: "implemented"` require `pv.otel.files`:

```json
{
  "id": "operation-started",
  "pv": {
    "event": { "name": "operation.started" },
    "otel": {
      "kind": "event",
      "category": "lifecycle",
      "files": ["src/path/to/file.ts"]
    },
    "status": "implemented"
  }
}
```

## Common Validation Errors

| Error | Fix |
|-------|-----|
| `Unknown scenario field "match"` | Remove `match` field, use `template.events` keys for matching |
| `Scenario X is a strict subset of Y` | Add distinguishing event to one scenario |
| `Scenario X has disconnected event(s)` | Add edges in canvas connecting the event |
| `Template contains emoji characters` | Remove emojis from template strings |
| `Add event X to canvas or remove from workflow` | Add node for the event in canvas |

## Current Status

**All 45 files passing validation** (9 canvas, 35 workflow, 1 library)

Run validation:
```bash
npx @principal-ai/principal-view-cli@latest validate
```

---

## Completed Work

### Canvas Files (all instrumented)

| Canvas | Status |
|--------|--------|
| `cleanup-operations/cleanup-operations.otel.canvas` | [x] |
| `decision-management/decision-management.otel.canvas` | [x] |
| `document-management/document-management.otel.canvas` | [x] |
| `draft-management/draft-management.otel.canvas` | [x] |
| `entry-points/entry-points.otel.canvas` | [x] |
| `init/init.otel.canvas` | [x] |
| `milestone-management/milestone-management.otel.canvas` | [x] |
| `search-operations/search-operations.otel.canvas` | [x] |
| `task-management/task-management.otel.canvas` | [x] |

### Workflow Files (all fixed)

All 35 workflow files now pass validation. Common fixes applied:
- Removed emojis from template strings
- Removed unsupported `match` fields
- Added distinguishing events to prevent subset conflicts
- Removed fallback scenarios

### Instrumentation Pattern

When adding OTEL instrumentation:

1. **Core-level operations** use `operation.action` span names (e.g., `draft.create`)
2. **Filesystem-level operations** use `filesystem.operation.action` span names to show they bypass Core
3. Add events for each stage: `.started`, `.complete`, `.error`
4. For conditional paths (like autoCommit), add distinguishing events (`.committed` vs `.commit-skipped`)
