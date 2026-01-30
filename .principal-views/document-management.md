# Document Management

## What This Is

Document management handles project documentation that lives alongside tasks. Documents are persistent reference material - guides, specs, runbooks, and other content that doesn't fit the task lifecycle.

## Documents vs Tasks vs Decisions

| Type | Purpose | Lifecycle |
|------|---------|-----------|
| Task | Work to be done | Created → Completed → Archived |
| Decision | Why we chose something | Proposed → Accepted → Superseded |
| Document | Reference material | Created → Updated (ongoing) |

Documents are living content that evolves with the project. They don't "complete" - they get updated.

## Document Structure

Each document contains:
- **ID**: Auto-generated identifier (DOC-001, etc.)
- **Title**: What the document covers
- **Content**: The actual documentation (markdown)
- **Created/Updated**: Timestamps for tracking freshness

## Operations

### Create

**Purpose**: Add new documentation to the project

Creates a document file with:
1. Auto-generated ID
2. Title and initial content
3. Creation timestamp

**Design choice**: Documents get IDs like other entities. This enables cross-referencing (tasks can link to documents, documents can reference decisions).

### View

**Purpose**: Read a single document

Loads and returns the document content. The view operation tracks what's being accessed for potential analytics on documentation usage.

### List

**Purpose**: Browse available documents

Returns all documents with optional search filtering. Helps answer "what documentation exists?"

**Design choice**: List supports text search across titles. For large documentation sets, this helps discovery without building a separate index.

### Update

**Purpose**: Keep documentation current

The update flow:
1. Load existing document
2. Validate the update
3. Update the "updated" timestamp
4. Save new content
5. Optionally commit

**Design choice**: Updates automatically refresh the timestamp. This helps identify stale documentation - if "last updated" is years ago, the document might need review.

### Search

**Purpose**: Find documents by content, not just title

Executes a text search across all documents. Different from list:
- List: Returns all documents, filters by title
- Search: Returns documents matching query in content

## Workflow Patterns

### Project Onboarding

1. Create documents: README, architecture overview, setup guide
2. Link from tasks: "See DOC-003 for API conventions"
3. Update as project evolves

### Runbook Maintenance

1. Create runbook document for operations
2. After incidents, update with lessons learned
3. Search finds procedures quickly during outages

### Specification Tracking

1. Create spec document when designing feature
2. Reference spec ID in related tasks
3. Update spec as implementation reveals issues
4. Spec becomes documentation of what was built

## Git Integration

Documents are version-controlled:
- Full history of how documentation evolved
- Blame shows who wrote what
- Branches for document updates that need review

**Auto-commit options**:
- Create: Commit new document immediately
- Update: Commit changes with update message

## Error Scenarios

### Document Not Found

**Happens when**: View, update, or search references non-existent ID
**Recovery**: Use list to see available documents, verify ID

### Create Validation Failure

**Happens when**: Missing required fields (title, content)
**Recovery**: Error specifies what's missing, provide required data

### Update Conflict

**Happens when**: Document was modified between load and save
**Recovery**: Reload document, merge changes, save again

The canvas maps errors to `document.error` with:
- `operation`: Which operation failed
- `error.stage`: Where in the flow it failed

## Performance Characteristics

- **Create**: O(1) - writes one file
- **View**: O(1) - reads one file
- **List**: O(n) - reads all n documents, filters in memory
- **Update**: O(1) - read + write one file
- **Search**: O(n) - full-text search across all documents

For very large documentation sets (hundreds of documents), consider organizing into subdirectories or using external documentation tools.

## Document vs External Docs

When to use backlog documents:
- Tightly coupled to tasks (specs, designs)
- Need cross-referencing with task IDs
- Want unified git history with code and tasks

When to use external docs (wiki, Notion, etc.):
- Public-facing documentation
- Rich media (videos, interactive elements)
- Collaboration features beyond git
