# Draft Management

## What This Is

Draft management handles task ideas that aren't ready for the main backlog. Drafts are a staging area for quick capture - jot down the idea now, refine it into a proper task later.

## Why Drafts Exist

The friction of creating a "proper" task can block capturing ideas:
- You're in the middle of something and don't want to context switch
- The idea isn't fully formed yet
- You're not sure if it's even worth doing

Drafts lower the barrier: capture first, organize later.

## Draft vs Task

| Aspect | Draft | Task |
|--------|-------|------|
| Location | `backlog/drafts/` | `backlog/` |
| Required fields | Just title | Title, status, etc. |
| Appears in lists | Only with explicit flag | By default |
| Purpose | Quick capture | Trackable work |

## Operations

### Create

**Purpose**: Capture an idea quickly

Creates a draft with minimal required data:
1. Generate draft ID (DRAFT-001, etc.)
2. Save with just the title
3. Optionally commit

**Design choice**: Drafts intentionally require less than tasks. The point is speed of capture. Validation happens when you promote.

### View

**Purpose**: See a specific draft's details

Loads draft content. Useful when reviewing drafts to decide which to promote.

### List

**Purpose**: See all pending drafts

Returns all drafts with optional filtering. Answers "what ideas have I captured?"

**Design choice**: List can filter drafts. Even in the "unorganized" space, you might have many drafts and need to find specific ones.

### Promote

**Purpose**: Graduate a draft to a full task

The promote operation:
1. Loads the draft
2. Moves it from `drafts/` to main `backlog/`
3. Validates it meets task requirements
4. Optionally commits

**Design choice**: Promote is a file move, not copy-delete. This preserves git history - you can trace a task back to its original draft capture.

### Archive

**Purpose**: Discard a draft without deleting

Moves draft to archive instead of deleting. Useful when:
- Idea turned out to not be worth pursuing
- Duplicate of something else
- You want to preserve for reference

**Design choice**: Archive over delete preserves history. You might realize later that a "bad" idea was actually good.

## Workflow Patterns

### Daily Capture

1. Throughout the day, create drafts for ideas
2. End of day, review drafts
3. Promote good ones to tasks
4. Archive or leave others for later

### Brainstorming Session

1. Rapid-fire draft creation
2. No discussion, just capture
3. Later: review, group, promote the best
4. Archive rejected ideas with notes why

### Triage Meeting

1. List all drafts
2. For each draft:
   - Promote to task if ready
   - Archive if not worth doing
   - Leave as draft if needs more thought

### Draft Refinement

1. View draft that needs work
2. Add details, research, etc.
3. Once clear, promote to task
4. Task gets proper priority, assignee, etc.

## Git Integration

All draft operations support auto-commit:
- Create: Commits new draft
- Promote: Commits the move to tasks
- Archive: Commits the move to archive

**Why commit drafts?** Even rough ideas have value in the git history. You can see when an idea first appeared and how it evolved.

## Error Scenarios

### Draft Not Found

**Happens when**: Promote or archive for non-existent draft
**Recovery**: Use list to see available drafts, check ID

### Promote Validation Failure

**Happens when**: Draft doesn't have enough info to be a proper task
**Recovery**: View draft, add required fields, retry promote

### Archive Directory Missing

**Happens when**: First archive on fresh repository
**Recovery**: Operation auto-creates archive directory

### Concurrent Access

**Happens when**: Two processes try to promote the same draft
**Recovery**: First one wins, second gets "not found" error

The canvas maps errors to `draft.error` with:
- `operation`: create, view, list, promote, archive
- `error.stage`: Where in the operation it failed
- `draftId`: Which draft (if applicable)

## Performance Characteristics

- **Create**: O(1) - writes one file
- **View**: O(1) - reads one file
- **List**: O(n) - reads all n drafts
- **Promote**: O(1) - moves one file
- **Archive**: O(1) - moves one file

Drafts are designed for low volume. If you have hundreds of drafts, consider promoting or archiving more aggressively.

## Best Practices

### Draft Titles

Make draft titles actionable enough to remember context:
- Good: "Fix login timeout on slow networks"
- Bad: "Login issue"

### Don't Let Drafts Rot

Review drafts regularly. Old drafts lose context - if you can't remember what "that API thing" meant, it's probably not worth keeping.

### Use Drafts for Uncertainty

If you're not sure something should be a task:
1. Create as draft
2. Think about it
3. If it's still relevant in a week, promote it
