# Backlog.md Core Events

## Overview

The core events in backlog.md track the fundamental operations of task management and document operations. These events provide observability into how tasks flow through their lifecycle and how the system interacts with documents.

## Task Lifecycle Events

### task.created
Emitted when a new task is created in the system. This is the entry point for all new tasks.

**Use cases:**
- Creating a task from the CLI
- Adding a task via the MCP interface
- Creating tasks programmatically

**Key attributes:**
- `task.id`: Unique identifier for the task
- `task.title`: The task's title
- `task.priority`: Optional priority level

### task.updated
Emitted when any fields of an existing task are modified.

**Use cases:**
- Editing task details
- Changing task status
- Updating priority or other metadata

**Key attributes:**
- `task.id`: The task being updated
- `fields.changed`: Array of field names that were modified

### task.completed
Emitted when a task is marked as complete.

**Use cases:**
- Marking a task as done
- Automatically completing tasks based on conditions
- Task completion workflows

**Key attributes:**
- `task.id`: The completed task
- `completion.timestamp`: When the task was completed

## Document Management Events

### document.created
Emitted when a new document is created in the backlog system.

**Use cases:**
- Creating markdown files for tasks
- Generating reports
- Creating documentation

**Key attributes:**
- `document.id`: Document identifier
- `document.type`: Type of document (task, milestone, decision, etc.)

## Search Events

### search.executed
Emitted when a search query is run against the backlog.

**Use cases:**
- Finding tasks by keyword
- Filtering tasks by criteria
- Full-text search operations

**Key attributes:**
- `search.query`: The search query string
- `results.count`: Number of results found

## Design Decisions

**Why event-based observability?**
Events provide fine-grained visibility into system operations without invasive logging. They enable metrics, tracing, and debugging while keeping the code clean.

**Attribute design:**
All events include the minimum required attributes to identify the operation and its outcome. Optional attributes provide additional context when available.

**Scope placement:**
These core events belong to the `backlog.md` scope, representing the fundamental library operations that all interfaces (CLI, MCP, HTTP, TUI, Web) build upon.
