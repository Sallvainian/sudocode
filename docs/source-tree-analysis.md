# sudocode — Source Tree Analysis

> Generated: 2026-03-22 | Scan Level: Exhaustive | Mode: Full Rescan

## Repository Structure

```
sudocode/                          # Monorepo root (npm workspaces)
├── package.json                   # Workspace config, build/test/dev scripts
├── vitest.config.ts               # Root test config
├── CONTRIBUTING.md                # Setup, build, test instructions
├── LICENSE                        # Apache-2.0
├── README.md                      # Project overview and documentation
│
├── types/                         # @sudocode-ai/types — Shared TypeScript definitions
│   ├── package.json               # Type-only package, exports .d.ts files
│   └── src/
│       ├── index.d.ts             # Core: Spec, Issue, Relationship, Feedback, Execution, Config
│       ├── agents.d.ts            # Agent configs: ClaudeCode, Codex, Copilot, Cursor, Gemini, Opencode
│       ├── artifacts.d.ts         # FileChangeStat, ChangesSnapshot, ExecutionChangesResult
│       ├── events.d.ts            # EntitySyncEvent, FileChangeEvent
│       ├── integrations.d.ts      # IntegrationPlugin, IntegrationProvider, ExternalEntity, SyncResult
│       ├── voice.d.ts             # STT/TTS providers, VoiceSettings, NarrationEvent
│       ├── workflows.d.ts         # WorkflowConfig, WorkflowStep, WorkflowSource, escalation types
│       ├── schema.ts              # SQLite table/index/view definitions (11 tables)
│       └── migrations.ts          # 5 database migrations with up/down functions
│
├── cli/                           # @sudocode-ai/cli — Core operations & CLI
│   ├── package.json               # commander, better-sqlite3, chokidar, gray-matter
│   ├── README.md                  # CLI documentation
│   └── src/
│       ├── cli.ts                 # ⚡ Entry point — Commander.js program setup
│       ├── index.ts               # Public API exports
│       ├── db.ts                  # SQLite initialization with WAL mode
│       ├── config.ts              # Config loading (project + local, split files)
│       ├── jsonl.ts               # JSONL read/write with atomic operations
│       ├── markdown.ts            # Frontmatter parsing, cross-reference extraction
│       ├── export.ts              # SQLite → JSONL export with debouncing
│       ├── import.ts              # JSONL → SQLite import with UUID dedup
│       ├── sync.ts                # Bidirectional markdown ↔ JSONL ↔ SQLite sync
│       ├── watcher.ts             # File system watcher for auto-sync
│       ├── merge-resolver.ts      # UUID-based JSONL conflict resolution
│       ├── git-merge.ts           # Git merge-file wrapper for 3-way merge
│       ├── yaml-conflict-resolver.ts  # YAML-specific conflict handling
│       ├── yaml-converter.ts      # Entity ↔ YAML serialization
│       ├── id-generator.ts        # Hash-based IDs (s-xxxx, i-xxxx) + UUID
│       ├── filename-generator.ts  # Unique markdown filename generation
│       ├── validation.ts          # Runtime type validators
│       ├── telemetry.ts           # Usage tracking
│       ├── update-checker.ts      # CLI update notifications
│       │
│       ├── operations/            # Database CRUD operations
│       │   ├── specs.ts           # Spec create/read/update/delete/list/search
│       │   ├── issues.ts          # Issue CRUD + status transitions + ready/blocked
│       │   ├── relationships.ts   # Add/remove relationships, auto-blocked status
│       │   ├── feedback.ts        # Feedback CRUD with anchor support
│       │   ├── feedback-anchors.ts # Anchor creation with auto-relocation algorithm
│       │   ├── tags.ts            # Tag add/remove/list/setTags
│       │   ├── references.ts      # Cross-reference formatting [[id]]
│       │   ├── external-links.ts  # External link CRUD for integrations
│       │   ├── transactions.ts    # Transaction wrapper with retry logic
│       │   └── events.ts          # Event log operations
│       │
│       ├── integrations/          # Plugin system & sync coordination
│       │   ├── types.ts           # IntegrationProvider interface, ProviderRegistry
│       │   ├── base-provider.ts   # Abstract BaseIntegrationProvider
│       │   ├── plugin-loader.ts   # Dynamic plugin loading (npm/local)
│       │   ├── registry.ts        # DefaultProviderRegistry
│       │   ├── sync-coordinator.ts # Bidirectional sync orchestration
│       │   ├── config-validator.ts # Integration config validation
│       │   └── config-resolver.ts # Config path resolution
│       │
│       ├── cli/                   # CLI command handlers (15 modules)
│       │   ├── spec-commands.ts   # spec create/list/show/update/delete/add-ref
│       │   ├── issue-commands.ts  # issue create/list/show/update/close/delete
│       │   ├── relationship-commands.ts # link command
│       │   ├── feedback-commands.ts # feedback add/list/show/dismiss/stale/relocate
│       │   ├── sync-commands.ts   # sync/export/import
│       │   ├── query-commands.ts  # ready/blocked
│       │   ├── status-commands.ts # status/stats
│       │   ├── config-commands.ts # config get/set/show
│       │   ├── init-commands.ts   # init project
│       │   ├── server-commands.ts # start local server
│       │   ├── plugin-commands.ts # plugin list/install/configure/test
│       │   ├── merge-commands.ts  # resolve-conflicts/merge-driver
│       │   ├── auth-commands.ts   # auth claude/status/clear
│       │   ├── update-commands.ts # update/check/dismiss
│       │   └── remote-commands.ts # remote codespaces spawn/config/list
│       │
│       ├── auth/                  # Authentication (OAuth, credentials)
│       └── remote/               # Remote deployment (Codespaces)
│
├── mcp/                           # @sudocode-ai/mcp — MCP server for AI agents
│   ├── package.json               # @modelcontextprotocol/sdk
│   ├── README.md                  # MCP tool documentation
│   └── src/
│       ├── index.ts               # ⚡ Entry point — arg parsing, validation
│       ├── server.ts              # SudocodeMCPServer — tool routing (CLI vs API)
│       ├── scopes.ts              # Scope system: 11 scopes, meta-scopes, tool filtering
│       ├── tool-registry.ts       # 53 tool definitions with JSON schemas
│       ├── api-client.ts          # SudocodeAPIClient — HTTP client for server
│       ├── client.ts              # SudocodeClient — CLI subprocess wrapper
│       ├── types.ts               # MCP type definitions
│       └── tools/                 # CLI-wrapped tool implementations
│           ├── issues.ts          # ready, list/show/upsert issues
│           ├── specs.ts           # list/show/upsert specs
│           ├── relationships.ts   # link
│           ├── feedback.ts        # add_feedback
│           └── references.ts      # add_reference
│
├── server/                        # @sudocode-ai/local-server — Express REST + WebSocket
│   ├── package.json               # express, ws, better-sqlite3, zod, ACP SDKs
│   └── src/
│       ├── index.ts               # ⚡ Entry point — Express app, WebSocket, startup
│       ├── cli.ts                 # Server CLI with commander
│       │
│       ├── routes/                # Express route handlers (18 routers)
│       │   ├── issues.ts          # GET/POST/PATCH/DELETE /api/issues
│       │   ├── specs.ts           # GET/POST/PATCH/DELETE /api/specs
│       │   ├── relationships.ts   # GET/POST/DELETE /api/relationships
│       │   ├── feedback.ts        # GET/POST/PATCH/DELETE /api/feedback
│       │   ├── executions.ts      # Execution CRUD + stream + sync + changes
│       │   ├── workflows.ts       # Workflow CRUD + lifecycle control
│       │   ├── agents.ts          # Agent discovery and verification
│       │   ├── bmad.ts            # BMAD status/agents/artifacts/execute/gate/workflow
│       │   ├── projects.ts        # Project listing/browsing/opening
│       │   ├── config.ts          # Config read/write
│       │   ├── plugins.ts         # Plugin management
│       │   ├── import.ts          # On-demand entity import
│       │   ├── editors.ts         # Open in IDE
│       │   ├── files.ts           # File search
│       │   ├── voice.ts           # Transcription endpoint
│       │   ├── repo-info.ts       # Git repository info
│       │   ├── version.ts         # Version info
│       │   └── update.ts          # Update management
│       │
│       ├── services/              # Business logic (20+ services)
│       │   ├── execution-service.ts       # Execution lifecycle management
│       │   ├── execution-lifecycle.ts     # Worktree creation/cleanup
│       │   ├── execution-changes-service.ts # File change tracking
│       │   ├── worktree-sync-service.ts   # Sync: squash/preserve/stage
│       │   ├── agent-registry.ts          # Agent discovery (6 types, 24h cache)
│       │   ├── bmad-execution-service.ts  # BMAD persona-based execution
│       │   ├── bmad-gate-service.ts       # Quality gates (pass/concerns/fail)
│       │   ├── bmad-workflow-service.ts   # 4-phase workflow generation
│       │   ├── websocket.ts               # WebSocket broadcast + subscriptions
│       │   ├── project-registry.ts        # Multi-project registry
│       │   ├── project-manager.ts         # Project lifecycle
│       │   ├── project-context.ts         # Per-project service container
│       │   └── [entity services, STT/TTS]
│       │
│       ├── execution/             # Execution engine
│       │   ├── adapters/          # Agent adapters (claude, codex, copilot, cursor)
│       │   ├── executors/         # ACP + legacy executor wrappers
│       │   ├── output/            # Session update coalescing
│       │   └── worktree/          # Git worktree management
│       │
│       └── workflow/              # Workflow orchestration
│           ├── engines/
│           │   ├── sequential-engine.ts     # Linear step execution
│           │   └── orchestrator-engine.ts   # AI-managed dynamic execution
│           └── mcp/               # Workflow MCP server (subprocess)
│
├── frontend/                      # @sudocode-ai/local-ui — React SPA
│   ├── package.json               # React 18, Vite, TailwindCSS, Radix, TanStack Query
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx               # ⚡ Entry point — React DOM render
│       ├── App.tsx                # Router, providers, 14+ route definitions
│       │
│       ├── pages/                 # Route-based pages (14 pages)
│       │   ├── IssuesPage.tsx     # Kanban board with drag-and-drop
│       │   ├── SpecsPage.tsx      # Spec list with import
│       │   ├── ExecutionsPage.tsx  # Multi-chain grid view
│       │   ├── WorkflowsPage.tsx  # Workflow list + DAG detail
│       │   ├── WorktreesPage.tsx  # Worktree management
│       │   ├── BmadDashboardPage.tsx  # BMAD phase tracker + artifacts
│       │   ├── BmadPipelinePage.tsx   # BMAD DAG pipeline visualization
│       │   ├── BmadSprintPage.tsx     # BMAD sprint kanban board
│       │   └── [detail pages, archived pages, projects]
│       │
│       ├── components/            # React components (100+)
│       │   ├── executions/        # Execution display (40+ files)
│       │   ├── issues/            # Issue kanban, cards, panels
│       │   ├── specs/             # Spec editor (Tiptap), viewer, feedback
│       │   ├── workflows/         # Workflow DAG (React Flow + dagre)
│       │   ├── bmad/              # BMAD components (18 files)
│       │   ├── chat-widget/       # Chat assistant widget
│       │   ├── import/            # Entity import flow
│       │   ├── entities/          # Entity badges, hover cards
│       │   ├── layout/            # MainLayout, Sidebar
│       │   ├── ui/                # shadcn/ui primitives (Radix-based)
│       │   └── voice/             # Voice input/output
│       │
│       ├── hooks/                 # Custom React hooks (37+)
│       ├── contexts/              # React Contexts (4)
│       │   ├── ProjectContext.tsx  # Multi-project context
│       │   ├── WebSocketContext.tsx # Real-time subscriptions
│       │   ├── ThemeContext.tsx    # Light/dark + 9 color themes
│       │   └── ChatWidgetContext.tsx # Chat widget state
│       ├── lib/                   # Client libraries (API, WebSocket, TTS)
│       ├── types/                 # Frontend type definitions
│       ├── themes/                # 9 color theme definitions
│       └── utils/                 # Utility functions
│
├── sudocode/                      # Meta-package — bundles all for npm install
│
├── plugins/                       # Integration plugins (5)
│   ├── integration-bmad/          # BMAD Method (9 personas, 4-phase pipeline)
│   │   └── src/
│   │       ├── plugin.ts          # BmadPlugin + BmadProvider
│   │       ├── entity-mapper.ts   # Artifacts → specs, epics/stories → issues
│   │       ├── id-generator.ts    # Deterministic IDs (bm-prd, bme-N, bms-N-M)
│   │       ├── relationship-mapper.ts # Hierarchy relationships
│   │       ├── watcher.ts         # Content-hashing file watcher
│   │       ├── persona-prompts.ts # 9 persona system prompts
│   │       ├── parser/            # PRD, architecture, epic, story, sprint parsers
│   │       └── writer/            # Sprint-status + story write-back
│   ├── integration-beads/         # Beads (JSONL-based, bidirectional)
│   ├── integration-github/        # GitHub Issues (read-only, on-demand import)
│   ├── integration-openspec/      # OpenSpec (file-based, bidirectional)
│   └── integration-speckit/       # Spec-Kit (file-based, bidirectional)
│
├── build-scripts/                 # SEA binary packaging
│   ├── esbuild-cli.js             # CLI bundle
│   ├── esbuild-mcp.js             # MCP bundle
│   ├── esbuild-server.js          # Server bundle + frontend assets
│   └── package-sea.js             # Multi-platform packaging (6 targets)
│
├── scripts/                       # Deployment scripts
│   ├── publish.sh                 # NPM publish pipeline
│   ├── install.sh                 # XDG-compliant installer
│   ├── link.sh                    # Local dev linking
│   └── sync-dependencies.js       # Meta-package dep sync
│
├── .github/workflows/             # CI/CD
│   ├── test.yml                   # PR validation (Node 22)
│   ├── publish.yml                # NPM publish with provenance
│   ├── build-binaries.yml         # SEA builds (6 platforms + integration tests)
│   └── version_test.yml           # Version consistency
│
├── .sudocode/                     # Self-hosted project data
├── docs/                          # Generated + hand-written documentation
└── review/                        # BMAD integration review (5 critical issues)
```

## File Count Summary

| Package | Source Files | Purpose |
|---------|-------------|---------|
| types | 9 | Shared TypeScript definitions |
| cli | 50+ | CLI commands, CRUD operations, sync, merge |
| mcp | 12 | MCP server, 53 tools, scope system |
| server | 70+ | REST API, execution engine, workflows |
| frontend | 140+ | React SPA, 100+ components, 37+ hooks |
| plugins (5) | 55+ | Integration plugins |
| build/scripts | 8 | SEA packaging, CI/CD |
| **Total** | **350+** | |

## Critical Directories

| Directory | Purpose |
|-----------|---------|
| `types/src/` | All shared interfaces — start here to understand the data model |
| `cli/src/operations/` | Database CRUD — the canonical data access layer |
| `cli/src/integrations/` | Plugin system — how external tools integrate |
| `server/src/routes/` | REST API — all HTTP endpoints |
| `server/src/services/` | Business logic — execution, sync, workflows |
| `server/src/execution/` | Execution engine — agent adapters, worktree isolation |
| `server/src/workflow/` | Workflow orchestration — sequential + AI-managed |
| `frontend/src/pages/` | UI pages — feature inventory |
| `frontend/src/hooks/` | Data hooks — client-server interaction patterns |
| `plugins/integration-bmad/` | BMAD integration — methodology support with personas |
