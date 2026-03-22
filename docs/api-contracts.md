# API Contracts

> Generated: 2026-03-22 | Source: server/src/routes/, mcp/src/tool-registry.ts, cli/src/cli.ts

---

## 1. REST API (Server)

Base URL: `http://localhost:3000`

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Project-ID` | Yes (entity routes) | Project identifier. Set automatically by `requireProject` middleware. Not required for `/health`, `/api/version`, `/api/update`, `/api/agents`, `/api/projects`. |
| `Content-Type` | Yes (POST/PUT) | `application/json` for all JSON bodies. `multipart/form-data` for voice transcription. |

### Response Format

All responses follow a consistent envelope:

```jsonc
// Success
{ "success": true, "data": { ... } }

// Success (create)
// HTTP 201
{ "success": true, "data": { ... } }

// Error
{ "success": false, "data": null, "message": "Human-readable error", "error_data": "..." }
```

---

### Health & Status

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health check. Returns `status`, `timestamp`, `uptime`, and open project list. No project context required. |
| `GET` | `/api/project/status` | Project dashboard. Returns `ready_issues` (open, unblocked), `active_executions` (running/pending/preparing), and `running_workflows` (running/pending/paused). Requires project context. |
| `GET` | `/ws/stats` | WebSocket server statistics (clients, subscriptions). No project context required. |

---

### Issues

All routes require project context (`X-Project-ID`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/issues` | List issues |
| `GET` | `/api/issues/:id` | Get single issue |
| `POST` | `/api/issues` | Create issue (201) |
| `PUT` | `/api/issues/:id` | Update issue |
| `DELETE` | `/api/issues/:id` | Delete issue |
| `POST` | `/api/issues/:id/refresh_from_external` | Refresh from external source |

**GET /api/issues query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter: `open`, `in_progress`, `blocked`, `closed` |
| `priority` | number | Filter by priority (0-4) |
| `assignee` | string | Filter by assignee |
| `archived` | boolean | Include archived (default: `false`) |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

**POST /api/issues body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Title (max 500 chars) |
| `content` | string | No | Markdown content |
| `status` | string | No | Initial status (default: `open`) |
| `priority` | number | No | Priority 0-4 (default: 2) |
| `assignee` | string | No | Assignee identifier |
| `parent_id` | string | No | Parent issue ID for hierarchy |

**PUT /api/issues/:id body:** Same fields as create (all optional), plus `archived` (boolean).

**POST /api/issues/:id/refresh_from_external:**

| Query Param | Type | Description |
|-------------|------|-------------|
| `force` | boolean | Skip conflict check, overwrite local changes |

---

### Specs

All routes require project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/specs` | List specs |
| `GET` | `/api/specs/:id` | Get single spec |
| `POST` | `/api/specs` | Create spec (201) |
| `PUT` | `/api/specs/:id` | Update spec |
| `DELETE` | `/api/specs/:id` | Delete spec |
| `POST` | `/api/specs/:id/refresh_from_external` | Refresh from external source |

**GET /api/specs query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `priority` | number | Filter by priority |
| `archived` | boolean | Include archived (default: `false`) |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

**POST /api/specs body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Title (max 500 chars) |
| `content` | string | No | Markdown content |
| `priority` | number | No | Priority 0-4 (default: 2) |
| `parent_id` | string | No | Parent spec ID |

**PUT /api/specs/:id body:** Same fields as create (all optional), plus `archived` (boolean).

---

### Relationships

All routes require project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/relationships/:entity_type/:entity_id` | Get all relationships for entity |
| `GET` | `/api/relationships/:entity_type/:entity_id/outgoing` | Get outgoing relationships |
| `GET` | `/api/relationships/:entity_type/:entity_id/incoming` | Get incoming relationships |
| `POST` | `/api/relationships` | Create relationship (201) |
| `DELETE` | `/api/relationships` | Delete relationship (body-based) |

**Path parameters:** `entity_type` must be `spec` or `issue`.

**Outgoing/Incoming query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `relationship_type` | string | Filter by type |

**POST /api/relationships body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_id` | string | Yes | Source entity ID |
| `from_type` | string | Yes | `spec` or `issue` |
| `to_id` | string | Yes | Target entity ID |
| `to_type` | string | Yes | `spec` or `issue` |
| `relationship_type` | string | Yes | One of: `blocks`, `related`, `discovered-from`, `implements`, `references`, `depends-on` |
| `metadata` | object | No | Optional metadata |

**DELETE /api/relationships body:** Same fields as create (minus `metadata`).

---

### Feedback

All routes require project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feedback` | List feedback |
| `GET` | `/api/feedback/:id` | Get single feedback |
| `POST` | `/api/feedback` | Create feedback (201) |
| `PUT` | `/api/feedback/:id` | Update feedback |
| `DELETE` | `/api/feedback/:id` | Delete feedback |

**GET /api/feedback query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `to_id` (or `spec_id`) | string | Filter by target entity |
| `from_id` (or `issue_id`) | string | Filter by source entity |
| `feedback_type` | string | `comment`, `suggestion`, `request` |
| `dismissed` | boolean | Filter by dismissed status |
| `limit` | number | Max results |
| `offset` | number | Pagination offset |

**POST /api/feedback body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to_id` (or `spec_id`) | string | Yes | Target entity ID (spec or issue) |
| `from_id` (or `issue_id`) | string | No | Source issue ID (omit for anonymous) |
| `feedback_type` | string | Yes | `comment`, `suggestion`, or `request` |
| `content` | string | Yes | Feedback content |
| `agent` | string | No | Agent name |
| `anchor` | object | No | Anchor with `anchor_status` (`valid`, `relocated`, `stale`), line, section, text_snippet, context |
| `dismissed` | boolean | No | Default: `false` |

**PUT /api/feedback/:id body:** `content`, `dismissed`, `anchor` (all optional, at least one required).

---

### Executions

All routes require project context. Mounted under `/api` (not `/api/executions`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/executions` | List all executions |
| `GET` | `/api/executions/:id` | Get execution details |
| `POST` | `/api/executions` | Start adhoc execution (no issue) (201) |
| `POST` | `/api/issues/:issueId/executions` | Start execution for issue (201) |
| `GET` | `/api/issues/:issueId/executions` | List executions for issue |
| `GET` | `/api/executions/:id/chain` | Get execution chain (root + follow-ups) |
| `GET` | `/api/executions/:id/logs` | Get CoalescedSessionUpdate events |
| `POST` | `/api/executions/:id/follow-up` | Create follow-up execution (201) |
| `POST` | `/api/executions/:id/cancel` | Cancel running execution |
| `POST` | `/api/executions/:id/skip-all-permissions` | Cancel and restart with permissions skipped (201) |
| `POST` | `/api/executions/:id/permission/:requestId` | Respond to permission request |
| `GET` | `/api/executions/:id/permissions` | Get pending permission requests |
| `POST` | `/api/executions/:id/mode` | Set session mode (code/plan/architect) |
| `POST` | `/api/executions/:id/interrupt` | Interrupt active execution |
| `POST` | `/api/executions/:id/fork` | Fork execution (experimental, ACP) (201) |
| `DELETE` | `/api/executions/:id` | Delete execution chain |
| `GET` | `/api/executions/:id/worktree` | Check if worktree exists |
| `DELETE` | `/api/executions/:id/worktree` | Delete worktree |

**GET /api/executions query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
| `status` | string | Single or comma-separated: `running`, `completed`, `failed`, `cancelled`, `pending`, `preparing`, `paused`, `stopped` |
| `issueId` | string | Filter by issue |
| `sortBy` | string | `created_at` or `updated_at` |
| `order` | string | `asc` or `desc` (default: `desc`) |
| `since` | string | ISO date string |
| `includeRunning` | boolean | When used with `since`, also include running executions regardless of age |
| `tags` | string | Single or comma-separated tag filter |

**POST /api/issues/:issueId/executions body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Execution prompt/instructions |
| `config` | object | No | Execution configuration (agent-specific) |
| `agentType` | string | No | `claude-code`, `codex`, `copilot`, `cursor` (default: `claude-code`) |

**POST /api/executions body (adhoc):** Same as above but `prompt` is strictly required.

**POST /api/executions/:id/follow-up body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `feedback` | string | Yes | Follow-up instructions |

**POST /api/executions/:id/permission/:requestId body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `optionId` | string | Yes | Selected option (e.g., `allow_once`, `reject_always`) |

**POST /api/executions/:id/mode body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | Yes | Session mode (`code`, `plan`, `architect`) |

**POST /api/executions/:id/interrupt body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | No | If provided, cancel current work and continue with this prompt |

**DELETE /api/executions/:id query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cancel` | boolean | If `true`, cancel instead of delete |
| `deleteBranch` | boolean | Also delete git branch |
| `deleteWorktree` | boolean | Also delete worktree directory |

**DELETE /api/executions/:id/worktree query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `deleteBranch` | boolean | Also delete git branch |

#### Code Changes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/executions/:id/changes` | File change stats (committed + uncommitted) |
| `GET` | `/api/executions/:id/changes/file` | Individual file diff |

**GET /api/executions/:id/changes/file query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | Yes | Path to file |

#### Worktree Sync

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/executions/:id/sync/preview` | Preview sync (conflicts, diff, commits, warnings) |
| `POST` | `/api/executions/:id/sync/squash` | Squash all commits to single commit on target |
| `POST` | `/api/executions/:id/sync/preserve` | Merge preserving full commit history |
| `POST` | `/api/executions/:id/sync/stage` | Apply changes to working directory without committing |

**POST /api/executions/:id/sync/squash body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `commitMessage` | string | No | Custom commit message |

**POST /api/executions/:id/sync/stage body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `includeUncommitted` | boolean | No | Also copy uncommitted files from worktree |
| `overrideLocalChanges` | boolean | No | Skip merge, overwrite local changes |

---

### Workflows

All routes require project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workflows` | List workflows |
| `GET` | `/api/workflows/:id` | Get workflow details |
| `POST` | `/api/workflows` | Create workflow (201) |
| `DELETE` | `/api/workflows/:id` | Delete workflow |
| `POST` | `/api/workflows/:id/start` | Start pending workflow |
| `POST` | `/api/workflows/:id/pause` | Pause running workflow |
| `POST` | `/api/workflows/:id/resume` | Resume paused workflow |
| `POST` | `/api/workflows/:id/cancel` | Cancel workflow |
| `POST` | `/api/workflows/:id/steps/:stepId/retry` | Retry a failed step |
| `POST` | `/api/workflows/:id/execute` | Execute workflow (orchestrator) |
| `POST` | `/api/workflows/:id/complete` | Complete workflow |
| `POST` | `/api/workflows/:id/escalate` | Escalate workflow |
| `POST` | `/api/workflows/:id/notify` | Send notification |
| `POST` | `/api/workflows/:id/merge` | Merge workflow worktree |
| `POST` | `/api/workflows/:id/await-events` | Wait for workflow events |
| `GET` | `/api/workflows/:id/events` | Get workflow events |
| `GET` | `/api/workflows/:id/escalation` | Get pending escalation |
| `POST` | `/api/workflows/:id/escalation/:requestId/respond` | Respond to escalation |
| `POST` | `/api/workflows/:id/escalation/notify` | Notify escalation |
| `GET` | `/api/workflows/:id/status` | Get extended workflow status |

**GET /api/workflows query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
| `status` | string/array | Filter: `pending`, `running`, `paused`, `completed`, `failed`, `cancelled` |
| `sortBy` | string | `created_at` or `updated_at` |
| `order` | string | `asc` or `desc` |

**POST /api/workflows body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | object | Yes | Source with `type` (`spec`, `issues`, `root_issue`, `goal`) and type-specific fields (`specId`, `issueIds`, `issueId`, `goal`) |
| `config` | object | No | Workflow config including optional `engineType` (`sequential` or `orchestrator`) |

**POST /api/workflows/:id/resume body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | No | Optional message to send to orchestrator on resume |

**DELETE /api/workflows/:id query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `deleteWorktree` | boolean | Also delete worktree directory |
| `deleteBranch` | boolean | Also delete git branch |

---

### Agents

No project context required.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents` | List available agents with verification |
| `GET` | `/api/agents/:agentType/models` | Get available models for agent |
| `POST` | `/api/agents/:agentType/discover-commands` | Discover slash commands |

**GET /api/agents query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `verify` | boolean | Skip verification if `false` (default: `true`) |
| `skipCache` | boolean | Bypass 24-hour cache (default: `false`) |

**GET /api/agents/:agentType/models query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `skipCache` | boolean | Bypass 24-hour cache (default: `false`) |

**Response:** `{ agents: [{ type, displayName, supportedModes, implemented, available, ... }] }`

---

### BMAD

All routes require project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bmad/status` | Installation and phase status |
| `GET` | `/api/bmad/agents` | List BMAD personas (9 total) |
| `GET` | `/api/bmad/artifacts` | Scan project artifacts |
| `POST` | `/api/bmad/import` | Trigger artifact sync to sudocode |
| `POST` | `/api/bmad/workflow` | Generate workflow template from artifacts |
| `POST` | `/api/bmad/gate` | Apply quality gate |
| `POST` | `/api/bmad/gate/resolve` | Resolve quality gate |
| `POST` | `/api/bmad/execute` | Execute with persona |

**POST /api/bmad/gate body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gateType` | string | Yes | Quality gate type |
| `result` | string | Yes | Gate result |
| `items` | array | No | Gate items |

**POST /api/bmad/execute body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `issueId` | string | No | Issue to associate |
| `persona` | string | Yes | BMAD persona (e.g., `pm`, `architect`, `sm`) |
| `skill` | string | Yes | BMAD skill (e.g., `create-prd`) |
| `prompt` | string | No | Additional instructions |
| `agentType` | string | No | Agent type (default: `claude-code`) |

---

### Config

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Get full project configuration |
| `GET` | `/api/config/integrations` | Get integrations config only |
| `PUT` | `/api/config/integrations` | Update integrations config |
| `POST` | `/api/config/integrations/:provider/test` | Test provider connection |
| `PUT` | `/api/config/voice` | Update voice settings |

---

### Plugins

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/plugins` | List all plugins with status and capabilities |
| `GET` | `/api/plugins/:name` | Get plugin details |
| `POST` | `/api/plugins/:name/activate` | Activate plugin (creates config entry) |
| `POST` | `/api/plugins/:name/deactivate` | Deactivate plugin (sets `enabled: false`) |
| `PUT` | `/api/plugins/:name/options` | Update plugin options and integration config |
| `POST` | `/api/plugins/:name/test` | Test plugin connection |
| `POST` | `/api/plugins/:name/install` | Install plugin via npm (global) |
| `POST` | `/api/plugins/:name/sync` | Trigger full sync for plugin |
| `POST` | `/api/plugins/sync` | Trigger sync for all enabled plugins |
| `DELETE` | `/api/plugins/:name` | Remove plugin configuration |

---

### Import

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/import/providers` | List import-capable providers with URL patterns |
| `POST` | `/api/import/preview` | Preview import from URL (detect provider, fetch entity) |
| `POST` | `/api/import/search` | Search external provider for entities |
| `POST` | `/api/import/batch` | Batch import multiple entities |
| `POST` | `/api/import` | Import entity from URL |
| `POST` | `/api/import/refresh` | Bulk refresh imported entities |

**POST /api/import body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | External URL to import |
| `options.includeComments` | boolean | No | Import comments as feedback |
| `options.tags` | string[] | No | Tags to apply |
| `options.priority` | number | No | Priority level |
| `options.parentId` | string | No | Parent entity ID |

**POST /api/import/refresh body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | No | Filter by provider name |
| `entityIds` | string[] | No | Specific entity IDs to refresh |
| `force` | boolean | No | Skip conflict check (default: `false`) |

---

### Voice

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/voice/config` | Get voice providers and configuration |
| `POST` | `/api/voice/transcribe` | Transcribe audio (multipart, `audio` field) |
| `GET` | `/api/voice/tts/status` | Get TTS sidecar status |
| `POST` | `/api/voice/tts/setup` | Initialize TTS environment (install Kokoro) |

**POST /api/voice/transcribe:**
- Content-Type: `multipart/form-data`
- `audio`: Audio file (webm, mp3, wav, ogg, flac, m4a; max 25MB)
- `language`: Language code (default: `en`)
- `provider`: Optional provider override

---

### Projects

No project context required.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List registered projects |
| `POST` | `/api/projects` | Add/open project |

---

### Repository Info

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/repo-info` | Get git repository info (branch, remotes, status) |
| `GET` | `/api/repo-info/branches` | List local branches |
| `GET` | `/api/repo-info/worktrees` | List all worktrees in `.sudocode/worktrees/` |
| `POST` | `/api/repo-info/worktrees/preview` | Preview worktree sync (standalone) |

---

### Editors

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/open-in-ide` | Open worktree in configured IDE |

**POST /api/open-in-ide body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `worktreePath` | string | Yes | Path to worktree |
| `editorType` | string | No | Editor type override |

---

### Files

Requires project context.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/files/search` | Search files in project |

**GET /api/files/search query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `limit` | number | No | Max results (default: 20) |
| `includeDirectories` | boolean | No | Include directories (default: `false`) |

---

### Version

No project context required.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/version` | Get version info for all packages |

---

### Update

No project context required.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/update/check` | Check for available updates |
| `POST` | `/api/update/install` | Install latest version via npm |
| `POST` | `/api/update/dismiss` | Dismiss update notification for 30 days |
| `POST` | `/api/update/restart` | Restart the server process |

---

## 2. CLI Commands

```
sudocode init                              # Initialize .sudocode directory

sudocode spec create <title>               # Create spec (-p priority, -d desc, --parent, --tags)
sudocode spec list                         # List specs (-p priority, -g search, --archived, --limit)
sudocode spec show <id>                    # Show spec details
sudocode spec update <id>                  # Update spec (--title, -p, -d, --parent, --tags, --archived)
sudocode spec delete <id...>               # Delete spec(s)
sudocode spec add-ref <entity> <ref>       # Add [[ref]] to spec markdown

sudocode issue create <title>              # Create issue (-p, -d, -a assignee, --parent, --tags)
sudocode issue list                        # List issues (-s status, -a, -p, -g, --archived, --limit)
sudocode issue show <id>                   # Show issue details
sudocode issue update <id>                 # Update issue (-s, -p, -a, --title, -d, --parent, --archived)
sudocode issue close <id...>               # Close issue(s) (-r reason)
sudocode issue delete <id...>              # Delete issue(s) (--hard for permanent)
sudocode issue add-ref <entity> <ref>      # Add [[ref]] to issue markdown

sudocode link <from> <to>                  # Create relationship (-t type, default: references)

sudocode ready                             # Show ready issues (open, no blockers)
sudocode blocked                           # Show blocked issues
sudocode status                            # Project status summary (-v verbose)
sudocode stats                             # Detailed project statistics

sudocode config get [key]                  # Get config value (or show all)
sudocode config set <key> <value>          # Set config value
sudocode config show                       # Show source of truth configuration

sudocode sync [--watch]                    # Sync JSONL <-> SQLite
sudocode export                            # Export SQLite to JSONL
sudocode import                            # Import JSONL to SQLite

sudocode feedback add <target> [issue]     # Add feedback (-l line, -t text, --type, -c content, -a agent)
sudocode feedback list                     # List feedback (-i issue, -t target, --type, --status, --limit)
sudocode feedback show <id>                # Show feedback details
sudocode feedback dismiss <id>             # Dismiss feedback
sudocode feedback stale                    # Show stale feedback
sudocode feedback relocate                 # Relocate stale feedback anchors

sudocode server start                      # Start local server

sudocode plugin list                       # List available plugins
sudocode plugin install <name>             # Install plugin
sudocode plugin info <name>                # Show plugin details
sudocode plugin configure <name>           # Configure plugin
sudocode plugin test <name>                # Test plugin connection
sudocode plugin status                     # Show plugin status
sudocode plugin uninstall <name>           # Uninstall plugin

sudocode auth claude                       # Authenticate with Claude
sudocode auth status                       # Show auth status
sudocode auth clear                        # Clear stored credentials

sudocode update                            # Check for and install updates
sudocode update check                      # Check only

sudocode resolve-conflicts                 # Resolve JSONL merge conflicts
sudocode merge-driver                      # Run JSONL merge driver
sudocode merge-driver init                 # Install git merge driver
sudocode merge-driver remove               # Remove git merge driver

sudocode remote spawn                      # Spawn remote Codespace
sudocode remote config                     # Configure remote settings
sudocode remote list                       # List remote environments
sudocode remote status                     # Show remote status
sudocode remote stop                       # Stop remote environment
```

**Global options:** `--db <path>` (database path), `--json` (JSON output), `--version`

---

## 3. MCP Tools (32 tools)

The MCP server exposes tools organized by scope. Extended scopes require `--server-url` for HTTP API access.

### default scope (10 tools) -- CLI-wrapped, no server required

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `ready` | Project status and ready work | -- |
| `list_issues` | Search/filter issues | `status`, `priority`, `archived`, `limit`, `search` |
| `show_issue` | Issue details with relationships | `issue_id` (required) |
| `upsert_issue` | Create or update issue | `issue_id?`, `title`, `description`, `priority`, `parent`, `tags`, `status`, `archived` |
| `list_specs` | Search/browse specs | `limit`, `search` |
| `show_spec` | Spec details with feedback | `spec_id` (required) |
| `upsert_spec` | Create or update spec | `spec_id?`, `title`, `description`, `priority`, `parent`, `tags` |
| `link` | Create entity relationship | `from_id`, `to_id` (required), `type` |
| `add_reference` | Insert `[[ID]]` cross-reference | `entity_id`, `reference_id` (required), `display_text?`, `relationship_type?`, `line?`, `text?`, `format?` |
| `add_feedback` | Provide anchored feedback | `to_id` (required), `issue_id?`, `content?`, `type?`, `line?`, `text?` |

### overview scope (1 tool) -- requires server

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `project_status` | Ready issues, active executions, running workflows | -- |

### executions:read scope (2 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `list_executions` | List with filters | `status[]`, `issue_id`, `limit`, `since`, `tags[]` |
| `show_execution` | Execution details | `execution_id` (required) |

### executions:write scope (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `start_execution` | Start execution for issue | `issue_id` (required), `agent_type?`, `model?`, `prompt?` |
| `start_adhoc_execution` | Start without issue | `prompt` (required), `agent_type?`, `model?` |
| `create_follow_up` | Continue from previous execution | `execution_id`, `feedback` (both required) |
| `cancel_execution` | Cancel running execution | `execution_id` (required), `reason?` |

### inspection scope (2 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `execution_changes` | Code changes (files, additions, deletions, commits) | `execution_id` (required), `include_diff?` |
| `execution_chain` | Full chain (root + follow-ups) | `execution_id` (required) |

### workflows:read scope (3 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `list_workflows` | List with status filter | `status[]`, `limit` |
| `show_workflow` | Workflow details and steps | `workflow_id` (required) |
| `workflow_status` | Extended status with step progress | `workflow_id` (required) |

### workflows:write scope (5 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_workflow` | Create from spec or issue | `source` (required), `config?` |
| `start_workflow` | Start pending workflow | `workflow_id` (required) |
| `pause_workflow` | Pause running workflow | `workflow_id` (required) |
| `cancel_workflow` | Cancel workflow | `workflow_id` (required) |
| `resume_workflow` | Resume paused workflow | `workflow_id` (required) |

### voice scope (1 tool)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `speak` | Narrate text via TTS | `text` (required) |

### bmad scope (3 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `bmad_status` | Current phase and artifact completion | -- |
| `bmad_next_step` | Next recommended workflow step | -- |
| `bmad_run_skill` | Start BMAD execution with persona | `skill` (required), `issue_id?`, `persona?`, `agent_type?` |

### Meta-scopes

| Meta-scope | Expands to |
|------------|------------|
| `project-assistant` | `overview`, `executions` (read+write), `inspection`, `workflows` (read+write) |
| `all` | `default`, `overview`, `executions` (read+write), `inspection`, `workflows` (read+write), `bmad` |

---

## 4. WebSocket API

### Connection

- **Path:** `ws://localhost:3000/ws`
- **Heartbeat:** 30-second ping/pong
- **Stats:** `GET /ws/stats`

### Client Messages

```jsonc
{
  "type": "subscribe" | "unsubscribe" | "ping" | "tts_request",
  "project_id": "...",          // Project ID for scoping
  "entity_type": "issue" | "spec" | "execution" | "workflow" | "all",
  "entity_id": "...",           // Specific entity or omit for all of type
  // TTS fields (when type is "tts_request")
  "request_id": "...",
  "text": "...",
  "voice": "...",
  "speed": 1.0
}
```

### Subscription Patterns

```
{project_id}:{entity_type}:{entity_id}    # Specific entity
{project_id}:all                           # All events for project
```

### Server Message Types

**Entity events:**
- `issue_created`, `issue_updated`, `issue_deleted`
- `spec_created`, `spec_updated`, `spec_deleted`
- `feedback_created`, `feedback_updated`, `feedback_deleted`
- `relationship_created`, `relationship_deleted`

**Execution events:**
- `execution_created`, `execution_updated`, `execution_status_changed`, `execution_deleted`

**Session events:**
- `session_pending`, `session_paused`, `session_ended`

**Workflow events:**
- `workflow_created`, `workflow_updated`, `workflow_deleted`
- `workflow_started`, `workflow_paused`, `workflow_resumed`
- `workflow_completed`, `workflow_failed`, `workflow_cancelled`
- `workflow_step_started`, `workflow_step_completed`, `workflow_step_failed`, `workflow_step_skipped`

**Voice events:**
- `voice_narration`
- `tts_audio` (base64 PCM chunk), `tts_end`, `tts_error`

**Project events:**
- `project_opened`, `project_closed`

**System events:**
- `pong`, `error`, `subscribed`, `unsubscribed`

### Server Message Format

```jsonc
{
  "type": "execution_status_changed",
  "projectId": "...",
  "data": { /* entity data */ },
  "message": "...",
  "subscription": "...",
  // TTS-specific fields
  "request_id": "...",
  "chunk": "...",           // Base64 PCM (tts_audio)
  "index": 0,              // Chunk index (tts_audio)
  "is_final": false,        // Final chunk flag (tts_audio)
  "total_chunks": 5,        // Total chunks (tts_end)
  "duration_ms": 1200,      // Synthesis duration (tts_end)
  "error": "...",           // Error message (tts_error)
  "recoverable": true,      // Can retry (tts_error)
  "fallback": false          // Should fallback to browser TTS (tts_error)
}
```
