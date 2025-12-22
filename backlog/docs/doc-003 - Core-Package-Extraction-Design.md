# Core Package Extraction Design

## Overview

This document outlines the plan to extract Backlog.md's core business logic into a standalone, runtime-agnostic package (`@backlog-md/core`) that can be published separately and consumed by different environments (Bun CLI, Node.js, browser, etc.).

## Motivation

1. **Runtime Independence**: The core task management logic should work in any JavaScript environment, not just Bun
2. **Reusability**: Other projects could use Backlog.md's task management as a library
3. **Testing**: Pure core logic enables fast, deterministic unit tests without filesystem/git mocking
4. **Architecture Clarity**: Clear separation between business logic and runtime-specific code

## Current State (Completed)

The adapter pattern has already been implemented in commit `d49dfbd`:

### Abstractions (`src/pure-core/abstractions/`)

```
FileSystemAdapter.ts  - exists, readFile, writeFile, createDir, deleteFile, etc.
GlobAdapter.ts        - scan, scanSync, match
GitAdapter.ts         - exec, isGitRepository, initRepository
index.ts              - re-exports all interfaces
```

### Bun Adapters (`src/bun-adapters/`)

```
BunFileSystemAdapter.ts  - Uses Bun.file, Bun.write
BunGlobAdapter.ts        - Uses Bun.Glob
BunGitAdapter.ts         - Uses Bun.spawn for git commands
index.ts                 - Exports + factory functions
```

### Test Adapters (`src/test-adapters/`)

```
InMemoryFileSystemAdapter.ts  - In-memory filesystem for testing
InMemoryGlobAdapter.ts        - Glob matching on in-memory files
MockGitAdapter.ts             - Configurable mock with assertion helpers
index.ts                      - Exports + factory functions
```

### Core Integration

The `Core` class (`src/core/backlog.ts`) accepts adapters via `CoreOptions`:

```typescript
interface CoreOptions {
  enableWatchers?: boolean;
  adapters?: {
    fs?: FileSystemAdapter;
    glob?: GlobAdapter;
    git?: GitAdapter;
  };
}
```

When no adapters are provided, it defaults to Bun adapters (backward compatible).

## Package Structure

### Target: `@backlog-md/core`

The extracted package will contain:

```
@backlog-md/core/
├── package.json
├── src/
│   ├── abstractions/           # Adapter interfaces
│   │   ├── FileSystemAdapter.ts
│   │   ├── GlobAdapter.ts
│   │   ├── GitAdapter.ts
│   │   └── index.ts
│   │
│   ├── core/                   # Core business logic
│   │   ├── backlog.ts          # Main Core class
│   │   ├── config-migration.ts
│   │   ├── content-store.ts
│   │   ├── reorder.ts
│   │   ├── search-service.ts
│   │   ├── sequences.ts
│   │   ├── task-loader.ts
│   │   └── index.ts
│   │
│   ├── file-system/            # FileSystem service
│   │   ├── operations.ts
│   │   └── index.ts
│   │
│   ├── git/                    # GitOperations service
│   │   ├── operations.ts
│   │   └── index.ts
│   │
│   ├── markdown/               # Parser & serializer (pure)
│   │   ├── parser.ts
│   │   ├── serializer.ts
│   │   └── index.ts
│   │
│   ├── types/                  # Type definitions
│   │   ├── index.ts
│   │   └── ...
│   │
│   ├── utils/                  # Pure utility functions
│   │   ├── task-path.ts
│   │   ├── status.ts
│   │   ├── sorting.ts
│   │   └── ...
│   │
│   ├── constants/              # Default values
│   │   └── index.ts
│   │
│   └── index.ts                # Main entry point
│
├── test-adapters/              # Published separately or as subpath
│   ├── InMemoryFileSystemAdapter.ts
│   ├── InMemoryGlobAdapter.ts
│   ├── MockGitAdapter.ts
│   └── index.ts
│
└── README.md
```

### Remaining in `backlog.md` (CLI package)

```
backlog.md/
├── src/
│   ├── cli.ts                  # CLI entry point
│   ├── commands/               # CLI command handlers
│   ├── bun-adapters/           # Bun-specific adapters
│   ├── ui/                     # TUI components
│   ├── web/                    # Web server + React UI
│   ├── mcp/                    # MCP server
│   ├── formatters/             # CLI output formatters
│   └── ...
└── ...
```

## What Goes Into Core Package

### Must Include (Pure Logic)

| Module | Reason |
|--------|--------|
| `abstractions/` | Adapter interfaces - the contract |
| `core/backlog.ts` | Main API class |
| `core/content-store.ts` | In-memory task cache |
| `core/search-service.ts` | Full-text search |
| `core/sequences.ts` | Sequence/ordering logic |
| `core/reorder.ts` | Ordinal calculations |
| `core/config-migration.ts` | Config version handling |
| `core/task-loader.ts` | Cross-branch task loading |
| `file-system/operations.ts` | FileSystem service |
| `git/operations.ts` | GitOperations service |
| `markdown/` | Parser & serializer |
| `types/` | All type definitions |
| `utils/` | Pure utility functions |
| `constants/` | Default values |

### Must NOT Include (Runtime-Specific)

| Module | Reason |
|--------|--------|
| `cli.ts` | Bun CLI entry point |
| `commands/` | CLI-specific handlers |
| `bun-adapters/` | Bun runtime implementation |
| `ui/` | TUI (blessed/ink) |
| `web/` | Bun.serve + React |
| `mcp/` | MCP protocol server |
| `formatters/` | CLI output formatting |
| `board.ts` | CLI board display |
| `readme.ts` | CLI readme generation |

### Conditional (Consider Including)

| Module | Decision |
|--------|----------|
| `test-adapters/` | Include as `@backlog-md/core/test-adapters` subpath export |

## Export Strategy

### Main Entry Point

```typescript
// @backlog-md/core
export { Core, type CoreOptions } from './core/backlog';
export type { FileSystemAdapter, GlobAdapter, GitAdapter } from './abstractions';
export type { Task, BacklogConfig, ... } from './types';
export { parseTaskMarkdown, serializeTaskMarkdown } from './markdown';
// ... other public APIs
```

### Subpath Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./abstractions": "./dist/abstractions/index.js",
    "./test-adapters": "./dist/test-adapters/index.js",
    "./markdown": "./dist/markdown/index.js",
    "./types": "./dist/types/index.js"
  }
}
```

## Migration Steps

### Phase 1: Prepare Monorepo Structure

1. Create `packages/` directory structure:
   ```
   packages/
   ├── core/           # @backlog-md/core
   └── cli/            # backlog.md (existing package)
   ```

2. Set up workspace configuration (bun workspaces or npm workspaces)

3. Move files according to the package structure above

### Phase 2: Update Imports

1. Update all imports in CLI package to use `@backlog-md/core`
2. Add `@backlog-md/core` as dependency in CLI package.json
3. Ensure backward compatibility for existing users

### Phase 3: Separate Git Repository (Optional)

If moving to a separate repository:

1. Use `git filter-repo` or `git subtree split` to extract history
2. Set up new repository with proper CI/CD
3. Publish to npm as `@backlog-md/core`
4. Update CLI package to depend on published package

## API Design Considerations

### Constructor Signature

```typescript
// Current (Bun-defaulting)
const core = new Core('/path/to/project');

// With custom adapters
const core = new Core('/path/to/project', {
  adapters: {
    fs: new NodeFileSystemAdapter(),
    glob: new NodeGlobAdapter(),
    git: new NodeGitAdapter(),
  }
});
```

### No Default Adapters in Core Package

The core package should NOT include Bun adapters. Consumers must provide adapters:

```typescript
// Option A: Require adapters (breaking change)
const core = new Core('/path', { adapters: { fs, glob, git } });

// Option B: Provide adapter bundles as separate packages
import { bunAdapters } from '@backlog-md/bun-adapters';
const core = new Core('/path', { adapters: bunAdapters });
```

**Recommendation**: Option B with separate adapter packages:
- `@backlog-md/bun-adapters`
- `@backlog-md/node-adapters` (future)
- `@backlog-md/browser-adapters` (future, limited)

## Compatibility Considerations

### Node.js Compatibility

Current code uses some Bun-specific APIs in "pure" modules:

1. **`Bun.file()` / `Bun.write()`** - Already abstracted via FileSystemAdapter
2. **`Bun.Glob`** - Already abstracted via GlobAdapter
3. **`Bun.spawn()`** - Already abstracted via GitAdapter
4. **`node:path`** - Works in Node.js
5. **`node:fs`** - Used in some places, needs review

Scan for remaining Bun-specific code:
```bash
grep -r "Bun\." src/core src/file-system src/git src/markdown src/utils src/types
```

### Browser Compatibility

For browser environments:
- Git operations would need a different approach (isomorphic-git or API)
- File operations would need IndexedDB or API adapter
- Most pure logic (parsing, types, utils) should work

## Testing Strategy

### Core Package Tests

Use test adapters for fast, deterministic tests:

```typescript
import { Core } from '@backlog-md/core';
import { createTestAdapters } from '@backlog-md/core/test-adapters';

const adapters = createTestAdapters();
const core = new Core('/test/project', { adapters });

// Seed in-memory filesystem
adapters.fs.writeFileSync('/test/project/backlog.md', '# Backlog');
```

### Integration Tests

Remain in CLI package, test with real filesystem/git.

## Open Questions

1. **Versioning**: Should core and CLI packages version together or independently?
2. **Adapter Packages**: Bundle adapters with core or separate packages?
3. **Breaking Changes**: How to handle the transition for existing users?
4. **Git History**: Preserve full history in extracted repo or start fresh?

## Next Steps

1. [ ] Audit remaining Bun-specific code in core modules
2. [ ] Set up monorepo workspace structure
3. [ ] Create package.json for core package
4. [ ] Move files and update imports
5. [ ] Add build configuration for core package
6. [ ] Write core package tests using test adapters
7. [ ] Create separate repository (if desired)
8. [ ] Publish to npm
