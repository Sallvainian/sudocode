# API Contracts

> Generated: 2026-03-21 | Source: server/src/routes/, mcp/src/server.ts

## REST API (Server)

Base URL: `http://localhost:3000/api`

### Entity CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/issues` | List issues (with filtering) |
| `POST` | `/api/issues` | Create issue |
| `GET` | `/api/issues/:id` | Get issue by ID |
| `PUT` | `/api/issues/:id` | Update issue |
| `DELETE` | `/api/issues/:id` | Delete issue |
| `GET` | `/api/specs` | List specs |
| `POST` | `/api/specs` | Create spec |
| `GET` | `/api/specs/:id` | Get spec by ID |
| `PUT` | `/api/specs/:id` | Update spec |
| `GET` | `/api/relationships` | List relationships |
| `POST` | `/api/relationships` | Create relationship |
| `DELETE` | `/api/relationships` | Delete relationship |
| `GET` | `/api/feedback` | List feedback |
| `POST` | `/api/feedback` | Add feedback |

### Execution Lifecycle

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/issues/:id/executions` | Start execution for issue |
| `POST` | `/api/executions` | Create ad-hoc execution |
| `GET` | `/api/executions` | List executions |
| `GET` | `/api/executions/:id` | Get execution details |
| `GET` | `/api/executions/:id/chain` | Get execution chain (root + follow-ups) |
| `GET` | `/api/executions/:id/stream` | SSE stream for real-time logs |
| `POST` | `/api/executions/:id/follow-up` | Create follow-up execution |
| `POST` | `/api/executions/:id/stop` | Stop/cancel execution |
| `POST` | `/api/executions/:id/prompt` | Send prompt to persistent session |
| `DELETE` | `/api/executions/:id` | Delete execution |

### Code Changes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/executions/:id/changes` | File change stats (committed + uncommitted) |
| `GET` | `/api/executions/:id/changes/file` | Individual file diff |
| `POST` | `/api/executions/:id/commit` | Commit uncommitted changes |

### Worktree Sync

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/executions/:id/sync/preview` | Preview sync (conflicts, diff) |
| `POST` | `/api/executions/:id/sync/squash` | Squash commits to target branch |
| `POST` | `/api/executions/:id/sync/preserve` | Preserve commit history |
| `POST` | `/api/executions/:id/sync/stage` | Stage without committing |

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workflows` | List workflows |
| `POST` | `/api/workflows` | Create workflow |
| `GET` | `/api/workflows/:id` | Get workflow details |
| `POST` | `/api/workflows/:id/start` | Start workflow |
| `POST` | `/api/workflows/:id/pause` | Pause workflow |
| `POST` | `/api/workflows/:id/resume` | Resume workflow |
| `POST` | `/api/workflows/:id/cancel` | Cancel workflow |
| `DELETE` | `/api/workflows/:id` | Delete workflow |
| `POST` | `/api/workflows/:id/escalation/:requestId/respond` | Respond to escalation |

### Agent Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents` | List available agents (with executable status) |

### Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Get merged configuration |
| `PUT` | `/api/config` | Update configuration |

### Import

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/import/url` | Import entity from URL |
| `POST` | `/api/import/refresh` | Refresh imported entities |

### Plugins

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/plugins` | List registered plugins |
| `POST` | `/api/plugins/:name/test` | Test plugin connection |
| `POST` | `/api/plugins/:name/sync` | Trigger plugin sync |
| `GET` | `/api/plugins/:name/search` | Search external entities |

### Voice

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/voice/config` | Get voice configuration |
| `POST` | `/api/voice/transcribe` | Transcribe audio (multipart) |
| `POST` | `/api/voice/synthesize` | Synthesize text to speech |

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Add project |
| `GET` | `/api/editors` | List available editors |
| `POST` | `/api/editors/open` | Open worktree in editor |
| `GET` | `/api/files/search` | Search files in project |
| `GET` | `/api/repo-info` | Get git repository info |
| `GET` | `/api/version` | Get version info |
| `GET` | `/api/update/check` | Check for updates |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws` | Real-time updates (execution logs, status changes, entity sync) |

WebSocket message format:
```json
{
  "type": "execution_status" | "execution_log" | "entity_sync" | "workflow_event" | "voice_narration",
  "projectDir": "/path/to/.sudocode",
  "data": { ... }
}
```

## MCP Tools (MCP Server)

The MCP server exposes these tools for AI coding agents:

| Tool | Description | Key Parameters |
|------|-------------|---------------|
| `ready` | Get project status and ready work | — |
| `list_issues` | List issues with filtering | `status`, `assignee` |
| `show_issue` | Show issue details | `id` |
| `upsert_issue` | Create or update issue | `id?`, `title`, `content`, `status`, `parent` |
| `list_specs` | List specs | — |
| `show_spec` | Show spec details | `id` |
| `upsert_spec` | Create or update spec | `id?`, `title`, `content` |
| `link` | Create relationship | `from`, `to`, `type` |
| `add_reference` | Insert cross-reference in markdown | `file`, `reference` |
| `add_feedback` | Provide anchored feedback | `from_id`, `to_id`, `type`, `content`, `anchor` |

## CLI Commands

```
sudocode init                           # Initialize .sudocode directory
sudocode spec create|list|show|update   # Spec management
sudocode issue create|list|show|update|close  # Issue management
sudocode link <from> <to> --type=<type> # Create relationship
sudocode ready                          # Show ready work (no blockers)
sudocode status                         # Project status summary
sudocode sync [--watch]                 # Sync JSONL ↔ SQLite
sudocode feedback add                   # Add anchored feedback
sudocode config get|set|show            # Configuration management
sudocode query <sql>                    # Direct SQL queries
sudocode merge                          # JSONL conflict resolution
sudocode ref                            # Cross-reference management
sudocode plugin test|config|sync        # Plugin management
sudocode remote                         # Remote environment (Codespaces)
sudocode auth login|status|clear        # Authentication
sudocode server start                   # Start local server
sudocode update                         # Check for updates
```
