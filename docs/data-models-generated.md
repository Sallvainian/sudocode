# Data Models

> Generated: 2026-03-22 | Scan Level: Exhaustive
> Source: types/src/index.d.ts, types/src/schema.ts, types/src/integrations.d.ts

## Entity Relationship Diagram

```
┌─────────┐     implements      ┌─────────┐
│  Spec    │<───────────────────│  Issue   │
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
     │  Issue   │────────>│  Execution   │
     │          │  1:many │              │
     └─────────┘         └──────┬───────┘
                                │ parent_execution_id
                                │ (execution chains)
                                v
                         ┌──────────────┐
                         │  Follow-up   │
                         │  Execution   │
                         └──────────────┘

     ┌──────────┐       ┌──────────────┐
     │ Workflow  │──────>│  Steps[]     │
     │          │ 1:many │  (ordered)   │
     └──────────┘       └──────┬───────┘
                               │ executionId
                               v
                        ┌──────────────┐
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
| `status` | `TEXT` | `open` / `in_progress` / `blocked` / `needs_review` / `closed` |
| `priority` | `INTEGER` | 0-4 scale (default: 2) |
| `assignee` | `TEXT` | Assigned agent or user |
| `archived` | `INTEGER` | 0 or 1 |
| `archived_at` | `DATETIME` | When archived |
| `parent_id` | `TEXT FK` | Parent issue for hierarchy |
| `parent_uuid` | `TEXT FK` | Parent issue UUID |
| `external_links` | `TEXT` | JSON array of ExternalLink objects |
| `closed_at` | `DATETIME` | When closed |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |

**Status Lifecycle:** `open` -> `in_progress` -> `blocked`/`needs_review` -> `closed`

### Execution

Tracks a single agent run on an issue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Unique execution ID |
| `issue_id` | `TEXT FK` | Linked issue (nullable) |
| `issue_uuid` | `TEXT FK` | Linked issue UUID (nullable) |
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
| `status` | `TEXT` | Execution status (see lifecycle below) |
| `exit_code` | `INTEGER` | Process exit code |
| `error_message` | `TEXT` | Error description |
| `error` | `TEXT` | Error detail |
| `model` | `TEXT` | AI model used |
| `summary` | `TEXT` | Execution summary |
| `files_changed` | `TEXT` | JSON list of changed files |
| `parent_execution_id` | `TEXT FK` | For execution chains (follow-ups) |
| `workflow_execution_id` | `TEXT` | Linked workflow |
| `step_type` | `TEXT` | Workflow step type |
| `step_index` | `INTEGER` | Workflow step index |
| `step_config` | `TEXT` | Workflow step configuration |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |
| `started_at` | `DATETIME` | When execution started running |
| `completed_at` | `DATETIME` | When execution finished |
| `cancelled_at` | `DATETIME` | When execution was cancelled |

**Status Lifecycle:** `preparing` -> `pending` -> `running` -> `paused`/`completed`/`failed`/`cancelled`/`stopped`

### Relationship

Polymorphic entity relationships.

| Field | Type | Description |
|-------|------|-------------|
| `from_id` | `TEXT` | Source entity ID |
| `from_uuid` | `TEXT` | Source entity UUID |
| `from_type` | `TEXT` | `spec` or `issue` |
| `to_id` | `TEXT` | Target entity ID |
| `to_uuid` | `TEXT` | Target entity UUID |
| `to_type` | `TEXT` | `spec` or `issue` |
| `relationship_type` | `TEXT` | `blocks`, `implements`, `depends-on`, `references`, `discovered-from`, `related` |
| `created_at` | `DATETIME` | Creation timestamp |
| `metadata` | `TEXT` | Optional JSON metadata |

**Composite PK:** `(from_id, from_type, to_id, to_type, relationship_type)`

### IssueFeedback

Anchored feedback with smart relocation. Polymorphic: issue->spec or issue->issue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Feedback ID |
| `from_id` | `TEXT` | Source issue ID (nullable for anonymous/external) |
| `from_uuid` | `TEXT` | Source issue UUID (nullable) |
| `to_id` | `TEXT` | Target spec or issue ID |
| `to_uuid` | `TEXT` | Target spec or issue UUID |
| `feedback_type` | `TEXT` | `comment`, `suggestion`, `request` |
| `content` | `TEXT` | Feedback content |
| `agent` | `TEXT` | Agent that created feedback |
| `anchor` | `TEXT` | JSON FeedbackAnchor object (see below) |
| `dismissed` | `INTEGER` | 0 or 1 |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |

**FeedbackAnchor fields:**

| Field | Type | Description |
|-------|------|-------------|
| `section_heading` | `string?` | Heading the feedback is anchored to |
| `section_level` | `number?` | Heading level (1-6) |
| `line_number` | `number?` | Exact line number |
| `line_offset` | `number?` | Character offset within line |
| `text_snippet` | `string?` | Text at the anchor point |
| `context_before` | `string?` | Lines before the anchor |
| `context_after` | `string?` | Lines after the anchor |
| `content_hash` | `string?` | Hash for change detection |
| `anchor_status` | `string` | `valid`, `relocated`, `stale` |
| `last_verified_at` | `string?` | When anchor was last verified |
| `original_location` | `object?` | Original line_number and section_heading |

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
| `source` | `TEXT (JSON)` | WorkflowSource: `spec`, `issues`, `root_issue`, or `goal` |
| `status` | `TEXT` | `pending`/`running`/`paused`/`completed`/`failed`/`cancelled` |
| `steps` | `TEXT (JSON)` | WorkflowStep array |
| `config` | `TEXT (JSON)` | WorkflowConfig (engine type, parallelism, failure strategy) |
| `worktree_path` | `TEXT` | Shared worktree for sequential execution |
| `branch_name` | `TEXT` | Workflow branch |
| `base_branch` | `TEXT` | Base branch for worktree |
| `current_step_index` | `INTEGER` | Current step being executed (default: 0) |
| `orchestrator_execution_id` | `TEXT FK` | Orchestrator agent execution |
| `orchestrator_session_id` | `TEXT` | Maintained across wakeups |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |
| `started_at` | `DATETIME` | When workflow started |
| `completed_at` | `DATETIME` | When workflow finished |

**Engine Types:**
- `sequential` -- Server-managed step execution
- `orchestrator` -- AI agent orchestrates dynamically

### WorkflowStep (JSON within Workflow.steps)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Step identifier |
| `issueId` | `string` | Linked issue ID |
| `index` | `number` | Step order (0-based) |
| `dependencies` | `string[]` | IDs of steps this depends on |
| `status` | `string` | `pending`/`running`/`completed`/`failed`/`skipped` |
| `executionId` | `string?` | Execution created for this step |

### WorkflowEvents

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Event ID |
| `workflow_id` | `TEXT FK` | Parent workflow |
| `type` | `TEXT` | Event type (step_completed, workflow_paused, etc.) |
| `step_id` | `TEXT` | Related step (optional) |
| `execution_id` | `TEXT FK` | Related execution (optional) |
| `payload` | `TEXT` | JSON event-specific data |
| `created_at` | `DATETIME` | When event occurred |
| `processed_at` | `DATETIME` | When orchestrator processed event |

## Supporting Entities

### Tag

| Field | Type | Description |
|-------|------|-------------|
| `entity_id` | `TEXT` | Entity ID |
| `entity_uuid` | `TEXT` | Entity UUID |
| `entity_type` | `TEXT` | `spec` or `issue` |
| `tag` | `TEXT` | Tag value |

**Composite PK:** `(entity_id, entity_type, tag)`

### Event

Audit log for entity lifecycle tracking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `INTEGER PK` | Auto-increment ID |
| `entity_id` | `TEXT` | Entity ID |
| `entity_uuid` | `TEXT` | Entity UUID |
| `entity_type` | `TEXT` | `spec` or `issue` |
| `event_type` | `TEXT` | `created`, `updated`, `status_changed`, `relationship_added`, `relationship_removed`, `tag_added`, `tag_removed` |
| `actor` | `TEXT` | Who triggered the event |
| `old_value` | `TEXT` | Previous value (nullable) |
| `new_value` | `TEXT` | New value (nullable) |
| `comment` | `TEXT` | Event comment (nullable) |
| `created_at` | `DATETIME` | When event occurred |
| `git_commit_sha` | `TEXT` | Associated git commit (nullable) |
| `source` | `TEXT` | Event source (nullable) |

### PromptTemplate

Reusable execution prompts.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `TEXT PK` | Template ID |
| `name` | `TEXT` | Template name |
| `description` | `TEXT` | Template description |
| `type` | `TEXT` | `issue`, `spec`, or `custom` |
| `template` | `TEXT` | Template content |
| `variables` | `TEXT` | JSON variable definitions |
| `is_default` | `INTEGER` | 0 or 1 |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |

### ExecutionLogs

| Field | Type | Description |
|-------|------|-------------|
| `execution_id` | `TEXT PK` | Linked execution |
| `raw_logs` | `TEXT` | Legacy JSONL format (newline-delimited JSON) |
| `normalized_entry` | `TEXT` | NDJSON format (NormalizedEntry objects from agent-execution-engine) |
| `byte_size` | `INTEGER` | Total log size |
| `line_count` | `INTEGER` | Number of log lines |
| `created_at` | `DATETIME` | Creation timestamp |
| `updated_at` | `DATETIME` | Last update timestamp |

Constraint: at least one of `raw_logs` or `normalized_entry` must be non-null.

## Integration Types (External System Mapping)

### ExternalEntity

Normalized representation of entities from external systems.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID in the external system |
| `type` | `string` | `spec` or `issue` |
| `title` | `string` | Entity title |
| `description` | `string?` | Entity content |
| `status` | `string?` | Status in external system |
| `priority` | `number?` | Priority (0-4 scale) |
| `url` | `string?` | URL to view in external system |
| `created_at` | `string?` | Creation time (ISO 8601) |
| `updated_at` | `string?` | Last update time (ISO 8601) |
| `relationships` | `ExternalRelationship[]?` | Relationships to other entities |
| `raw` | `unknown?` | Raw data from external system |

### ExternalChange

Represents a change detected in an external system for incremental sync.

| Field | Type | Description |
|-------|------|-------------|
| `entity_id` | `string` | Entity ID that changed |
| `entity_type` | `string` | `spec` or `issue` |
| `change_type` | `string` | `created`, `updated`, `deleted` |
| `timestamp` | `string` | When change occurred (ISO 8601) |
| `data` | `ExternalEntity?` | Entity data (present for created/updated) |

### ExternalRelationship

| Field | Type | Description |
|-------|------|-------------|
| `targetId` | `string` | Target entity ID in external system |
| `targetType` | `string` | `spec` or `issue` |
| `relationshipType` | `string` | `implements`, `blocks`, `depends-on`, `references`, `related`, `discovered-from` |

### ExternalLink

Stored on Spec/Issue entities to link them to external system records.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `string` | Plugin name (e.g., `"github"`, `"bmad"`) |
| `external_id` | `string` | ID in external system |
| `external_url` | `string?` | URL to view/edit |
| `sync_enabled` | `boolean` | Whether sync is active |
| `sync_direction` | `string` | `inbound`, `outbound`, `bidirectional` |
| `last_synced_at` | `string?` | Last sync timestamp |
| `external_updated_at` | `string?` | Last known update in external system |
| `metadata` | `Record?` | Provider-specific metadata |
| `imported_at` | `string?` | When initially imported (ISO 8601) |
| `content_hash` | `string?` | Hash for change detection |
| `import_metadata` | `Record?` | Metadata captured during import |

## ID Generation

IDs are hash-based for collision resistance and git-merge friendliness:

- **Format:** `{prefix}-{hash}` (e.g., `s-14sh`, `i-x7k9`)
- **Input:** `${entityType}-${title}-${timestamp}`
- **Length:** 4-8 characters, deterministic
- **Dual IDs:** Each entity has both `id` (hash, user-facing) and `uuid` (UUID v4, distributed sync/dedup)

## JSONL Format

Entities are stored as one JSON object per line, sorted by `created_at`:

### SpecJSONL

Extends Spec with embedded relationships and tags:

```json
{"id":"s-14sh","uuid":"...","title":"...","content":"...","priority":2,"relationships":[{"from":"s-14sh","from_type":"spec","to":"i-x7k9","to_type":"issue","type":"implements"}],"tags":["backend","api"]}
```

### IssueJSONL

Extends Issue with embedded relationships, tags, and feedback:

```json
{"id":"i-x7k9","uuid":"...","title":"...","content":"...","status":"open","relationships":[...],"tags":[...],"feedback":[{"id":"f-123","to_id":"s-14sh","feedback_type":"suggestion","content":"...","anchor":{...}}]}
```

Atomic writes via temp file + rename. File mtime set to newest `updated_at`.

## Storage Architecture

```
JSONL Files (specs.jsonl, issues.jsonl)    <- git-tracked, source of truth
    <-> (import/export)
SQLite Cache (cache.db)                    <- query engine (gitignored, rebuilt from JSONL)
    <-> (syncs via watcher)
Markdown Files (.sudocode/specs/*.md)      <- human interface (editable)
```

Source of truth is configurable in `.sudocode/config.json`:
- `"sourceOfTruth": "jsonl"` (default) -- JSONL files are authoritative, markdown derived
- `"sourceOfTruth": "markdown"` -- Markdown files are authoritative, JSONL derived

## Database Views

### ready_issues

Issues that are `open`, not `archived`, and have no open blockers.

### blocked_issues

Issues that have at least one open blocker, with blocker count and IDs.

## Key Indexes

| Index | Columns |
|-------|---------|
| `idx_specs_uuid` | `specs(uuid)` |
| `idx_specs_priority` | `specs(priority)` |
| `idx_specs_parent_id` | `specs(parent_id)` |
| `idx_specs_archived` | `specs(archived)` |
| `idx_issues_uuid` | `issues(uuid)` |
| `idx_issues_status` | `issues(status)` |
| `idx_issues_priority` | `issues(priority)` |
| `idx_issues_assignee` | `issues(assignee)` |
| `idx_issues_parent_id` | `issues(parent_id)` |
| `idx_issues_archived` | `issues(archived)` |
| `idx_rel_from_id` | `relationships(from_id, from_type)` |
| `idx_rel_to_id` | `relationships(to_id, to_type)` |
| `idx_rel_type` | `relationships(relationship_type)` |
| `idx_executions_issue` | `executions(issue_id)` |
| `idx_executions_status` | `executions(status)` |
| `idx_executions_workflow` | `executions(workflow_execution_id)` |
| `idx_feedback_from` | `issue_feedback(from_id)` |
| `idx_feedback_to` | `issue_feedback(to_id)` |
