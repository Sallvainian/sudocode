# Data Models

> Generated: 2026-03-21 | Source: types/src/index.d.ts, types/src/schema.ts

## Entity Relationship Diagram

```
┌─────────┐     implements      ┌─────────┐
│  Spec    │◄───────────────────│  Issue   │
│  s-xxxx  │     blocks         │  i-xxxx  │
│          │     depends-on     │          │
│          │     references     │          │
│          │     related        │          │
└────┬─────┘     discovered-from└────┬─────┘
     │                               │
     │  feedback (to_id)             │  feedback (from_id)
     │                               │
     └───────────────┬───────────────┘
                     │
              ┌──────┴──────┐
              │  Feedback   │
              │  (anchored) │
              └─────────────┘

     ┌─────────┐         ┌──────────────┐
     │  Issue   │────────▶│  Execution   │
     │          │  1:many │              │
     └─────────┘         └──────┬───────┘
                                │ parent_execution_id
                                │ (execution chains)
                                ▼
                         ┌──────────────┐
                         │  Follow-up   │
                         │  Execution   │
                         └──────────────┘
```

## Core Entities

### Spec

Represents user intent and requirements.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Hash-based ID (`s-xxxx`) |
| `uuid` | `TEXT UNIQUE` | UUID v4 for distributed sync |
| `title` | `TEXT` | Title (max 500 chars) |
| `file_path` | `TEXT` | Path to markdown file |
| `content` | `TEXT` | Markdown content |
| `priority` | `INTEGER` | 0-4 scale (default: 2) |
| `archived` | `INTEGER` | 0 or 1 |
| `archived_at` | `DATETIME` | When archived |
| `parent_id` | `TEXT FK` | Parent spec for hierarchy |
| `parent_uuid` | `TEXT FK` | Parent spec UUID |
| `external_links` | `TEXT` | JSON array of ExternalLink objects |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |

### Issue

Actionable work items for coding agents.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Hash-based ID (`i-xxxx`) |
| `uuid` | `TEXT UNIQUE` | UUID v4 |
| `title` | `TEXT` | Title (max 500 chars) |
| `content` | `TEXT` | Markdown content |
| `status` | `TEXT` | `open` → `in_progress` → `blocked`/`needs_review` → `closed` |
| `priority` | `INTEGER` | 0-4 scale |
| `assignee` | `TEXT` | Assigned agent or user |
| `archived` | `INTEGER` | 0 or 1 |
| `parent_id` | `TEXT FK` | Parent issue for hierarchy |
| `external_links` | `TEXT` | JSON array of ExternalLink objects |
| `closed_at` | `DATETIME` | When closed |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |

**Status Lifecycle:** `open` → `in_progress` → `blocked`/`needs_review` → `closed`

### Execution

Tracks a single agent run on an issue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Unique execution ID |
| `issue_id` | `TEXT FK` | Linked issue (nullable) |
| `agent_type` | `TEXT` | `claude-code`, `codex`, `gemini`, `opencode`, `copilot`, `cursor` |
| `mode` | `TEXT` | `worktree` or `local` |
| `prompt` | `TEXT` | Prompt sent to agent |
| `config` | `TEXT` | JSON agent configuration |
| `session_id` | `TEXT` | Agent session identifier |
| `target_branch` | `TEXT` | Branch to merge into |
| `branch_name` | `TEXT` | Execution branch |
| `before_commit` | `TEXT` | Git SHA before execution |
| `after_commit` | `TEXT` | Git SHA after execution |
| `worktree_path` | `TEXT` | Path to git worktree |
| `status` | `TEXT` | Execution status (see below) |
| `exit_code` | `INTEGER` | Process exit code |
| `error_message` | `TEXT` | Error description |
| `model` | `TEXT` | AI model used |
| `summary` | `TEXT` | Execution summary |
| `files_changed` | `TEXT` | JSON list of changed files |
| `parent_execution_id` | `TEXT FK` | For execution chains |
| `workflow_execution_id` | `TEXT` | Linked workflow |
| `step_type` | `TEXT` | Workflow step type |
| `step_index` | `INTEGER` | Workflow step index |

**Status Lifecycle:** `preparing` → `pending` → `running` → `paused`/`completed`/`failed`/`cancelled`/`stopped`

### Relationship

Polymorphic entity relationships.

| Field | Type | Description |
|-------|------|-------------|
| `from_id` | `TEXT` | Source entity ID |
| `from_type` | `TEXT` | `spec` or `issue` |
| `to_id` | `TEXT` | Target entity ID |
| `to_type` | `TEXT` | `spec` or `issue` |
| `relationship_type` | `TEXT` | `blocks`, `implements`, `depends-on`, `references`, `discovered-from`, `related` |

**Composite PK:** `(from_id, from_type, to_id, to_type, relationship_type)`

### IssueFeedback

Anchored feedback with smart relocation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Feedback ID |
| `from_id` | `TEXT` | Source issue (nullable for anonymous) |
| `to_id` | `TEXT` | Target spec or issue |
| `feedback_type` | `TEXT` | `comment`, `suggestion`, `request` |
| `content` | `TEXT` | Feedback content |
| `agent` | `TEXT` | Agent that created feedback |
| `anchor` | `TEXT` | JSON FeedbackAnchor object |
| `dismissed` | `INTEGER` | 0 or 1 |

**Anchor Relocation Algorithm:**
1. Try exact line match
2. Try text snippet match
3. Try section heading match
4. Mark as `stale` if all fail

### Workflow

Multi-issue orchestration with dependency DAGs.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Workflow ID |
| `title` | `TEXT` | Workflow title |
| `source` | `TEXT (JSON)` | WorkflowSource: spec, issues, root_issue, or goal |
| `status` | `TEXT` | `pending`/`running`/`paused`/`completed`/`failed`/`cancelled` |
| `steps` | `TEXT (JSON)` | WorkflowStep array |
| `config` | `TEXT (JSON)` | WorkflowConfig (engine type, parallelism, failure strategy) |
| `worktree_path` | `TEXT` | Shared worktree for sequential execution |
| `branch_name` | `TEXT` | Workflow branch |
| `base_branch` | `TEXT` | Base branch for worktree |
| `orchestrator_execution_id` | `TEXT FK` | Orchestrator agent execution |
| `orchestrator_session_id` | `TEXT` | Maintained across wakeups |

**Engine Types:**
- `sequential` — Server-managed step execution
- `orchestrator` — AI agent orchestrates dynamically

## ID Generation

IDs are hash-based for collision resistance and git-merge friendliness:
- Format: `{prefix}-{hash}` (e.g., `s-14sh`, `i-x7k9`)
- Generated from: `${entityType}-${title}-${timestamp}`
- 4-8 characters, deterministic
- Each entity also has a UUID v4 for distributed deduplication

## JSONL Format

Entities are stored as one JSON object per line, sorted by `created_at`:

```json
{"id":"s-14sh","uuid":"...","title":"...","content":"...","relationships":[...],"tags":["..."]}
{"id":"s-9f2k","uuid":"...","title":"...","content":"...","relationships":[...],"tags":["..."]}
```

Atomic writes via temp file + rename. File mtime set to newest `updated_at`.

## External Links

Entities can be linked to external systems via `external_links` JSON array:

```typescript
interface ExternalLink {
  provider: string;          // Plugin name (e.g., "github")
  external_id: string;       // ID in external system
  external_url?: string;     // URL to view/edit
  sync_enabled: boolean;     // Whether sync is active
  sync_direction: SyncDirection;  // "inbound" | "outbound" | "bidirectional"
  last_synced_at?: string;   // Last sync timestamp
  content_hash?: string;     // For change detection
}
```

## Database Views

### ready_issues
Issues that are `open`, not `archived`, and have no open blockers.

### blocked_issues
Issues that have at least one open blocker, with blocker count and IDs.
