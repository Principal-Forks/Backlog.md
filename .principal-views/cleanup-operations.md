# Cleanup Operations

## What This Is

Cleanup operations manage the lifecycle of completed tasks, helping maintain a clean and organized backlog. These operations handle previewing what would be cleaned up, executing batch cleanups, completing individual tasks, and listing archived tasks.

## Why Cleanup Matters

As projects progress, completed tasks accumulate in the backlog. Without cleanup:
- Active task lists become cluttered
- Querying tasks slows down
- It's harder to see what's actually in progress

Cleanup operations provide controlled ways to move completed work to archives while preserving history.

## Operations

### Preview

**Purpose**: See what tasks would be affected before committing to cleanup

Scans all tasks, filters by status and age, and shows what would be cleaned up without making changes.

**Parameters**:
- `olderThanDays`: Only include tasks completed more than N days ago

**Design choice**: Preview is a separate operation from batch cleanup. This follows the "preview before destructive" pattern - you always see the impact before committing.

### Batch Cleanup

**Purpose**: Move multiple completed tasks to archive in one operation

Executes the actual cleanup based on the same criteria as preview. Processes each task individually but reports aggregate results.

**Design choice**: Batch operations emit per-task progress events (`cleanup.batch.processing`) so you can track long-running cleanups and identify which specific task failed if something goes wrong.

### Complete Task

**Purpose**: Mark a single task as complete and optionally move to archive

The complete operation handles a single task's transition from active to completed state:
1. Locates the task file
2. Moves it to the completed directory
3. Optionally commits the change

**Design choice**: Complete is atomic per-task. If you're completing multiple tasks, batch cleanup is more efficient, but complete gives you fine-grained control.

### List Completed Tasks

**Purpose**: View what's already in the completed/archive directory

Returns all tasks that have been archived, useful for:
- Retrospectives
- Finding accidentally archived tasks
- Auditing cleanup history

## Workflow Patterns

### End of Sprint Cleanup

1. Run preview with `olderThanDays: 0` to see all completed tasks
2. Review the list for anything that shouldn't be archived
3. Run batch cleanup to archive everything

### Conservative Cleanup

1. Run preview with `olderThanDays: 30` (or your preferred threshold)
2. Only cleanup tasks that have been done for a while
3. Keeps recently completed tasks visible for context

### Single Task Completion

1. Finish work on a task
2. Run complete with `autoCommit: true`
3. Task moves to archive with git history

## Git Integration

All cleanup operations support optional auto-commit:
- Preview: Read-only, no git changes
- Batch cleanup: Can commit all moves in one commit
- Complete: Can commit the single task move
- List completed: Read-only, no git changes

## Error Scenarios

### Task Not Found

**Happens when**: Complete is called with an ID that doesn't exist in active tasks
**Recovery**: Check if task is already in archive or drafts, or verify the ID

### Batch Partial Failure

**Happens when**: Some tasks in a batch fail to move (permissions, git issues)
**Recovery**: The batch continues processing remaining tasks. Check `failedCount` in completion event and review error events for specific failures.

### Archive Directory Missing

**Happens when**: First cleanup on a fresh repository
**Recovery**: Operations auto-create the archive directory if needed

The canvas maps all errors to `cleanup.error` with:
- `operation`: Which operation failed (preview, batch, complete, list)
- `error.stage`: Where in the operation it failed
- `taskId`: Which specific task (if applicable)

## Performance Characteristics

- **Preview**: O(n) - scans all tasks, filters in memory
- **Batch cleanup**: O(k) where k = tasks to clean - moves k files
- **Complete**: O(1) - moves one file
- **List completed**: O(m) where m = archived tasks

For large backlogs, preview and batch operations include progress events so you can monitor execution.
