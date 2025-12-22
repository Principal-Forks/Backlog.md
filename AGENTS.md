
<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and completion
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->

When you're working on a task, you should assign it yourself: -a @codex

In addition to the rules above, please consider the following:
At the end of every task implementation, try to take a moment to see if you can simplify it. 
When you are done implementing, you know much more about a task than when you started.
At this point you can better judge retrospectively what can be the simplest architecture to solve the problem.
If you can simplify the code, do it.

## Commands

### Development

- `bun i` - Install dependencies
- `bun test` - Run all tests
- `bunx tsc --noEmit` - Type-check code
- `bun run check .` - Run all Biome checks (format + lint)
- `bun run build` - Build the CLI tool
- `bun run cli` - Uses the CLI tool directly

### Testing

- `bun test` - Run all tests
- `bun test <filename>` - Run specific test file

### Configuration Management

- `bun run cli config list` - View all configuration values
- `bun run cli config get <key>` - Get a specific config value (e.g. defaultEditor)
- `bun run cli config set <key> <value>` - Set a config value with validation

## Core Structure

- **CLI Tool**: Built with Bun and TypeScript as a global npm package (`npm i -g backlog.md`)
- **Source Code**: Located in `/src` directory with modular TypeScript structure
- **Task Management**: Uses markdown files in `backlog/` directory structure
- **Workflow**: Git-integrated with task IDs referenced in commits and PRs

## Code Standards

- **Runtime**: Bun with TypeScript 5
- **Formatting**: Biome with tab indentation and double quotes
- **Linting**: Biome recommended rules
- **Testing**: Bun's built-in test runner
- **Pre-commit**: Husky + lint-staged automatically runs Biome checks before commits

The pre-commit hook automatically runs `biome check --write` on staged files to ensure code quality. If linting errors
are found, the commit will be blocked until fixed.

## Git Workflow

- **Branching**: Use feature branches when working on tasks (e.g. `tasks/task-123-feature-name`)
- **Committing**: Use the following format: `TASK-123 - Title of the task`
- **Github CLI**: Use `gh` whenever possible for PRs and issues

## Alexandria

Alexandria is a unified context management system that helps AI assistants understand your project structure and documentation through structured codebase views.

### Key Commands

```bash
# List all codebase views in the repository
alexandria list

# Add a specific documentation file to the library
alexandria add-doc README.md
# Skip the interactive guidance prompt
alexandria add-doc README.md --skip-guidance
# Preview what would be created without actually creating it
alexandria add-doc README.md --skip-guidance --dry-run

# Add all untracked documentation files at once
alexandria add-all-docs

# Validate a specific codebase view
alexandria validate <view-name>

# Validate all codebase views
alexandria validate-all

# Check for context quality issues
alexandria lint
# Only fail on errors, not warnings
alexandria lint --errors-only

# Manage pre-commit hooks
alexandria hooks --add     # Add Alexandria validation to pre-commit
alexandria hooks --remove  # Remove Alexandria validation
alexandria hooks --check   # Check if hooks are installed
```

### What Alexandria Provides

- **Codebase Views**: Structured representations stored in `.alexandria/views/` that contain:
  - Documentation content organized in a grid layout
  - File references to relevant source code files
  - Relationships between different parts of your codebase
- **Context Library**: Maintains important documents with explicit file references for AI understanding
- **Quality Validation**: Ensures all views and file references are valid and properly formatted

### Understanding Codebase Views

Each codebase view in `.alexandria/views/` contains:
- **Grouped File References**: Related source files grouped together (e.g., `files: ['src/auth/login.ts', 'src/auth/session.ts']`)
- **Documentation Links**: Connections between documentation and the code it describes
- **Contextual Relationships**: Explicit mappings of which files work together

When exploring a codebase with Alexandria, these views tell you which files are related and should be considered together.

### Working with Alexandria

1. **Check existing views**: Use `alexandria list` to see what documentation is already indexed
2. **Add new documentation**: Use `alexandria add-doc <file>` for important files that should be part of the context
3. **Bulk add documents**: Use `alexandria add-all-docs` to quickly add all untracked markdown files
4. **Validate changes**: Always run `alexandria validate-all` to ensure all file references point to existing files

### Pre-commit Integration

If the project has a pre-commit hook configured, `alexandria lint` will run automatically to check for:
- Orphaned references in codebase views
- Stale context that needs updating
- Invalid view structures

For detailed information about hooks, rules, and configuration options, see [docs/HOOKS_AND_RULES.md](../docs/HOOKS_AND_RULES.md).

### Repository Views

For projects with GitHub integration, codebase views are automatically published to:
`https://a24z-ai.github.io/Alexandria/repo/?owner=<owner>&name=<repo>`
