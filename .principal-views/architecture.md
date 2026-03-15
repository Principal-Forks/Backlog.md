# Backlog.md Architecture

Backlog.md is a task management system designed for software development teams that prefer working with markdown files and git-based workflows.

## System Scopes

The system is organized into six instrumentation scopes:

### Core (`backlog.md`)
The core library handles all task management operations - CRUD for tasks, milestones, drafts, and documents. All entry points delegate to the core for business logic.

### CLI (`backlog.md.cli`)
Command-line interface for terminal users. Parses arguments, validates input, and dispatches to core operations.

### MCP Server (`backlog.md.mcp`)
Model Context Protocol server enabling AI assistant integration. Exposes backlog operations as MCP tools for Claude, Cursor, and other AI-powered editors.

### HTTP Server (`backlog.md.http`)
REST API server that serves the web UI and handles API requests from browser clients.

### Terminal UI (`backlog.md.tui`)
Interactive terminal user interface with kanban boards, task views, and search. Rendered by the CLI for rich terminal experiences.

### Web UI (`backlog.md.web`)
React-based browser interface served by the HTTP server. Provides visual task boards, milestone tracking, and documentation browsing.

## Design Principles

1. **Git-native**: All data stored in markdown files, version controlled naturally
2. **IDE-agnostic**: Works from any terminal or AI assistant
3. **Human-readable**: No proprietary formats, just markdown
4. **Offline-first**: No external services required
5. **Multiple interfaces**: CLI, TUI, Web, and MCP for different workflows
