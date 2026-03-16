# Backlog.md Span Conventions

This document describes the span conventions used in Backlog.md for OpenTelemetry instrumentation.

## Entry Points

Backlog.md supports multiple entry points for task management operations:

- **cli.request** - Command-line interface invocations
- **http.request** - HTTP API requests
- **mcp.tool** - Model Context Protocol tool calls
- **init** - Application initialization

## Domain Operations

### Task Management (task.*)
CRUD operations for tasks: create, edit, view, list, archive, complete, demote.

### Milestone Management (milestone.*)
Milestone lifecycle: create, view, list, archive.

### Document Management (document.*)
Document operations: create, update, view, list, search.

### Decision Management (decision.*)
Decision tracking: create, update, view, list.

### Draft Management (draft.*, filesystem.draft.*)
Draft workflow: create, archive, promote, and filesystem-based draft viewing.

### Search Operations (search.*)
Search functionality: initialize, query, index updates.

### Cleanup Operations (cleanup.*)
Maintenance: batch cleanup, preview operations.

## Span Hierarchy

Entry point spans (SERVER) can call domain operation spans (INTERNAL). The edges in the canvas represent valid parent-child relationships between span types.
