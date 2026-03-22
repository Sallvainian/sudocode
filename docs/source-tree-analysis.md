# Source Tree Analysis

> Generated: 2026-03-21 | Scan Level: Exhaustive

## Repository Structure

sudocode is an npm workspaces monorepo with 7 packages and 4 plugins.

```
sudocode/
├── types/                          # @sudocode-ai/types — Shared TypeScript definitions
│   └── src/
│       ├── index.d.ts              # Core entities: Spec, Issue, Execution, Feedback, Relationship
│       ├── agents.d.ts             # Agent configs: ClaudeCode, Codex, Copilot, Cursor, Gemini, Opencode
│       ├── artifacts.d.ts          # Execution artifacts: FileChangeStat, ChangesSnapshot
│       ├── events.d.ts             # Watcher events: EntitySyncEvent, FileChangeEvent
│       ├── integrations.d.ts       # Plugin system: IntegrationPlugin, IntegrationProvider
│       ├── voice.d.ts              # Voice/STT/TTS types and streaming messages
│       ├── workflows.d.ts          # Multi-issue workflows: Workflow, WorkflowStep, orchestration
│       ├── schema.ts               # SQLite schema definitions (11 tables, views, indexes)
│       └── migrations.ts           # Database migrations (v1-v5)
│
├── cli/                            # @sudocode-ai/cli — Core CLI operations
│   └── src/
│       ├── cli.ts                  # Entry point — Commander.js program setup
│       ├── index.ts                # Library exports for programmatic use
│       ├── cli/                    # Command registrations
│       │   ├── spec-commands.ts    # sudocode spec create|list|show|update
│       │   ├── issue-commands.ts   # sudocode issue create|list|show|update|close
│       │   ├── relationship-commands.ts  # sudocode link <from> <to>
│       │   ├── feedback-commands.ts      # sudocode feedback add
│       │   ├── sync-commands.ts    # sudocode sync [--watch]
│       │   ├── config-commands.ts  # sudocode config get|set|show
│       │   ├── status-commands.ts  # sudocode ready, sudocode status
│       │   ├── init-commands.ts    # sudocode init
│       │   ├── server-commands.ts  # sudocode server start
│       │   ├── query-commands.ts   # sudocode query (SQL queries)
│       │   ├── merge-commands.ts   # sudocode merge (JSONL conflict resolution)
│       │   ├── reference-commands.ts  # sudocode ref (cross-references)
│       │   ├── plugin-commands.ts  # sudocode plugin test|config|sync
│       │   ├── remote-commands.ts  # sudocode remote (Codespaces deploy)
│       │   ├── auth-commands.ts    # sudocode auth login|status|clear
│       │   └── update-commands.ts  # sudocode update
│       ├── operations/             # CRUD operations layer
│       │   ├── specs.ts            # Spec CRUD (create, list, get, update, delete, archive)
│       │   ├── issues.ts           # Issue CRUD + status transitions
│       │   ├── relationships.ts    # Relationship management (blocks, implements, etc.)
│       │   ├── feedback.ts         # Anchored feedback operations
│       │   ├── feedback-anchors.ts # Anchor relocation algorithm
│       │   ├── events.ts           # Event logging
│       │   ├── tags.ts             # Tag management
│       │   ├── references.ts       # Cross-reference extraction
│       │   ├── external-links.ts   # External system link management
│       │   └── transactions.ts     # Transaction support
│       ├── integrations/           # Plugin integration framework
│       │   ├── registry.ts         # Plugin registry
│       │   ├── plugin-loader.ts    # Dynamic plugin loading
│       │   ├── sync-coordinator.ts # Bidirectional sync orchestration
│       │   ├── base-provider.ts    # Base provider implementation
│       │   ├── config-resolver.ts  # Config resolution
│       │   ├── config-validator.ts # Config validation
│       │   └── utils/
│       │       └── conflict-resolver.ts  # Sync conflict resolution
│       ├── remote/                 # Remote environment support
│       │   ├── spawn-service.ts    # Codespaces spawn service
│       │   ├── git-context.ts      # Git context detection
│       │   └── config.ts           # Remote configuration
│       ├── auth/                   # Authentication
│       │   ├── credentials.ts      # Credential management (fnox-based)
│       │   ├── claude.ts           # Claude API auth
│       │   └── status.ts           # Auth status reporting
│       ├── db.ts                   # SQLite database initialization + migrations
│       ├── jsonl.ts                # JSONL read/write (atomic via temp+rename)
│       ├── markdown.ts             # Markdown parsing (frontmatter, cross-refs)
│       ├── sync.ts                 # JSONL ↔ SQLite ↔ Markdown sync engine
│       ├── watcher.ts              # Chokidar file watcher for auto-sync
│       ├── config.ts               # Config management (project + local)
│       ├── id-generator.ts         # Hash-based ID generation (s-xxxx, i-xxxx)
│       ├── git-merge.ts            # JSONL git merge driver
│       ├── merge-resolver.ts       # Merge conflict resolver
│       ├── telemetry.ts            # OpenTelemetry instrumentation
│       ├── export.ts               # SQLite → JSONL export
│       ├── import.ts               # JSONL → SQLite import
│       └── validation.ts           # Input validation utilities
│
├── mcp/                            # @sudocode-ai/mcp — MCP Server
│   └── src/
│       ├── index.ts                # Entry point — stdio MCP server
│       ├── server.ts               # Tool definitions (ready, list_issues, show_issue, etc.)
│       └── tools/                  # Individual tool implementations
│
├── server/                         # @sudocode-ai/local-server — Backend API
│   └── src/
│       ├── index.ts                # Express app setup, middleware, WebSocket
│       ├── cli.ts                  # Server CLI entry point
│       ├── routes/                 # REST API routes
│       │   ├── executions.ts       # /api/executions — execution lifecycle
│       │   ├── issues.ts           # /api/issues — issue CRUD
│       │   ├── workflows.ts        # /api/workflows — workflow management
│       │   ├── agents.ts           # /api/agents — agent discovery
│       │   ├── feedback.ts         # /api/feedback — feedback operations
│       │   ├── relationships.ts    # /api/relationships — entity relationships
│       │   ├── voice.ts            # /api/voice — STT/TTS endpoints
│       │   ├── config.ts           # /api/config — configuration
│       │   ├── import.ts           # /api/import — external entity import
│       │   ├── plugins.ts          # /api/plugins — integration management
│       │   ├── projects.ts         # /api/projects — multi-project support
│       │   ├── editors.ts          # /api/editors — IDE integration
│       │   ├── files.ts            # /api/files — file search
│       │   ├── repo-info.ts        # /api/repo-info — git repository info
│       │   ├── version.ts          # /api/version — version info
│       │   └── update.ts           # /api/update — update check
│       ├── services/               # Business logic layer
│       │   ├── execution-service.ts       # Execution orchestration
│       │   ├── execution-lifecycle.ts     # Execution state machine
│       │   ├── execution-changes-service.ts  # Code change tracking (diffs)
│       │   ├── execution-logs-store.ts    # Log storage (NDJSON)
│       │   ├── execution-worker-pool.ts   # Worker pool for parallel execution
│       │   ├── worktree-sync-service.ts   # Worktree → main sync (squash/preserve/stage)
│       │   ├── agent-registry.ts          # Agent executable discovery (24h cache)
│       │   ├── websocket.ts               # WebSocket manager (real-time events)
│       │   ├── watcher.ts                 # File watcher integration
│       │   ├── project-manager.ts         # Multi-project management
│       │   ├── project-registry.ts        # Project registry
│       │   ├── integration-sync-service.ts  # Integration sync orchestration
│       │   ├── external-refresh-service.ts  # External link refresh
│       │   ├── narration-service.ts       # Voice narration event generation
│       │   ├── stt-service.ts             # Speech-to-text service
│       │   ├── tts-service.ts             # Text-to-speech service
│       │   ├── prompt-resolver.ts         # Prompt template resolution
│       │   ├── prompt-template-engine.ts  # Template variable interpolation
│       │   ├── editor-service.ts          # IDE editor launching
│       │   ├── version-service.ts         # Version checking
│       │   ├── db.ts                      # Database service
│       │   └── file-search/               # File search strategies
│       ├── execution/              # Execution engine
│       │   ├── adapters/           # Agent adapters (ACP-based)
│       │   └── worktree/           # Worktree management
│       │       ├── manager.ts      # Worktree create/delete/list
│       │       ├── conflict-detector.ts  # Merge conflict detection
│       │       └── git-sync-cli.ts # Git sync operations
│       ├── workflow/               # Workflow orchestration
│       │   ├── engines/
│       │   │   ├── sequential-engine.ts    # Sequential step execution
│       │   │   └── orchestrator-engine.ts  # AI-driven orchestration
│       │   ├── mcp/                        # Workflow MCP server
│       │   │   ├── server.ts               # MCP tools for orchestrator
│       │   │   └── tools/                  # Escalation, execution, workflow tools
│       │   ├── dependency-analyzer.ts      # DAG dependency analysis
│       │   └── services/
│       │       ├── prompt-builder.ts       # Orchestrator prompt construction
│       │       └── wakeup-service.ts       # Event-driven orchestrator wakeup
│       ├── workers/                # Worker threads
│       │   ├── execution-worker.ts # Agent process spawning
│       │   └── worker-ipc.ts       # IPC communication
│       └── middleware/
│           └── project-context.ts  # Request-scoped project context
│
├── frontend/                       # @sudocode-ai/local-ui — React SPA
│   └── src/
│       ├── App.tsx                 # Root — React Router, QueryClient, WebSocket
│       ├── main.tsx                # Vite entry point
│       ├── pages/                  # Route-based pages
│       │   ├── ExecutionsPage.tsx   # Multi-execution grid view
│       │   ├── ExecutionDetailPage.tsx  # Single execution detail
│       │   ├── WorktreesPage.tsx   # Worktree management
│       │   ├── IssuesPage.tsx      # Issues list + detail
│       │   ├── SpecsPage.tsx       # Specs list + detail
│       │   ├── WorkflowsPage.tsx   # Workflow management + DAG
│       │   ├── ArchivedIssuesPage.tsx  # Archived issues
│       │   └── ProjectsPage.tsx    # Multi-project management
│       ├── components/             # Feature-organized components
│       │   ├── executions/         # ~30 components (grid, monitor, diff, agent config)
│       │   ├── issues/             # Issue cards, editor, Kanban board
│       │   ├── workflows/          # Workflow DAG, controls, escalation
│       │   ├── worktrees/          # Worktree cards, detail panel
│       │   ├── import/             # External entity import UI
│       │   ├── relationships/      # Relationship management UI
│       │   ├── entities/           # Entity badges, hover cards
│       │   ├── chat-widget/        # Floating chat widget
│       │   ├── voice/              # Voice input/narration UI
│       │   ├── layout/             # Sidebar, settings, help
│       │   ├── projects/           # Project switcher
│       │   ├── routing/            # Route guards
│       │   └── ui/                 # shadcn/ui primitives (Radix-based)
│       ├── hooks/                  # Custom React hooks
│       │   ├── useExecutions.ts    # Execution fetching (React Query + WS)
│       │   ├── useExecutionChanges.ts  # File change tracking
│       │   ├── useExecutionSync.ts # Sync operations
│       │   ├── useExecutionLogs.ts # Real-time log streaming
│       │   ├── useAgents.ts        # Agent discovery
│       │   ├── useWorktrees.ts     # Worktree management
│       │   ├── useWorkflows.ts     # Workflow operations
│       │   └── ...                 # ~20 more hooks
│       ├── contexts/               # React contexts
│       │   ├── WebSocketContext.tsx # Real-time WebSocket subscription
│       │   ├── ProjectContext.tsx   # Current project state
│       │   ├── ThemeContext.tsx     # Dark/light theme
│       │   └── ChatWidgetContext.tsx  # Chat widget state
│       ├── stores/                 # Zustand stores
│       │   └── ...                 # State management
│       └── lib/                    # Utilities
│           ├── api.ts              # Axios API client
│           └── utils.ts            # cn() helper, etc.
│
├── sudocode/                       # Meta-package — bundles all packages
│   └── package.json                # Dependencies on all @sudocode-ai/* packages
│
├── plugins/                        # Integration plugins
│   ├── integration-github/         # GitHub integration (gh CLI)
│   ├── integration-beads/          # Beads integration
│   ├── integration-openspec/       # OpenSpec integration
│   └── integration-speckit/        # SpecKit integration
│
├── build-scripts/                  # SEA (Single Executable Application) builds
│   ├── esbuild-cli.js             # Bundle CLI for SEA
│   ├── esbuild-mcp.js            # Bundle MCP for SEA
│   ├── esbuild-server.js          # Bundle server for SEA
│   └── package-sea.js             # Node.js SEA packaging
│
├── scripts/                        # Development scripts
│   ├── link.sh                    # npm link for local development
│   ├── version.sh                 # Version bumping
│   ├── publish.sh                 # NPM publishing
│   └── sync-dependencies.js       # Dependency version sync
│
├── .github/workflows/              # CI/CD
│   ├── test.yml                   # Test pipeline
│   ├── publish.yml                # NPM publish pipeline
│   ├── build-binaries.yml         # SEA binary builds
│   └── version_test.yml           # Version consistency checks
│
├── .sudocode/                      # Self-hosting (sudocode manages itself)
│   ├── specs/                     # Spec markdown files
│   ├── issues/                    # Issue markdown files
│   ├── specs.jsonl                # Spec data (git-tracked)
│   ├── issues.jsonl               # Issue data (git-tracked)
│   └── config.json                # Project config
│
├── docs/                           # Documentation (this directory)
├── package.json                    # Root workspace config
├── CONTRIBUTING.md                 # Contribution guidelines
└── LICENSE                         # Apache-2.0
```

## Critical Entry Points

| Package | Entry Point | Purpose |
|---------|------------|---------|
| **cli** | `cli/src/cli.ts` | CLI binary (`sudocode` / `sdc`) |
| **cli** | `cli/src/index.ts` | Programmatic API for other packages |
| **mcp** | `mcp/src/index.ts` | MCP stdio server (`sudocode-mcp`) |
| **server** | `server/src/cli.ts` | Server binary (`sudocode-server`) |
| **server** | `server/src/index.ts` | Express app factory |
| **frontend** | `frontend/src/main.tsx` | Vite SPA entry |

## Package Dependency Graph

```
types (standalone)
  ↓
cli (depends on types)
  ↓         ↓
mcp        server (both depend on cli + types)
            ↓
          frontend (independent, talks to server via REST/WS)

plugins/* (peer-depend on types)
sudocode (meta: bundles all)
```
