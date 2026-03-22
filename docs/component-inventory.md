# Component Inventory

> Generated: 2026-03-22 | Scan Level: Exhaustive

## Frontend Pages (15 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `IssuesPage` | `/issues` | Kanban board view with drag-and-drop status columns |
| `IssueDetailPage` | `/issues/:id` | Single issue detail with editor, relationships, executions |
| `SpecsPage` | `/specs` | Spec list with filtering and search |
| `SpecDetailPage` | `/specs/:id` | Spec viewer/editor with feedback panel and TOC |
| `ExecutionsPage` | `/executions` | Multi-execution CSS grid view with sidebar filtering |
| `ExecutionDetailPage` | `/executions/:id` | Execution chain view with follow-ups inline |
| `WorkflowsPage` | `/workflows` | Workflow list with DAG visualization |
| `WorkflowDetailPage` | `/workflows/:id` | Workflow detail with step panel and controls |
| `WorktreesPage` | `/worktrees` | Worktree management with sync dialogs |
| `BmadDashboardPage` | `/bmad` | BMAD Method dashboard with persona grid and phase overview |
| `BmadPipelinePage` | `/bmad/pipeline` | BMAD pipeline DAG with phase nodes and gate nodes |
| `BmadSprintPage` | `/bmad/sprint` | BMAD sprint board for story execution management |
| `ProjectsPage` | `/projects` | Multi-project management with directory browser |
| `ArchivedIssuesPage` | `/archived` | Archived issues with feedback |
| `ArchivedSpecsPage` | `/archived-specs` | Archived specs |

## Frontend Components by Domain

### Executions (33 components)

| Component | File | Purpose |
|-----------|------|---------|
| `ExecutionsGrid` | `executions/` | CSS Grid container for execution chain tiles |
| `ExecutionChainTile` | `executions/` | Compact tile showing execution chain in grid |
| `ExecutionView` | `executions/` | Full detail view with follow-up chain |
| `ExecutionMonitor` | `executions/` | Real-time status monitoring |
| `ExecutionPreview` | `executions/` | Lightweight execution preview |
| `ExecutionHistory` | `executions/` | Execution history list |
| `ExecutionStatusBadge` | `executions/` | Status indicator badge |
| `ExecutionsSidebar` | `executions/` | Filtering, visibility, status display |
| `InlineExecutionView` | `executions/` | Inline execution within issue view |
| `AgentTrajectory` | `executions/` | Visualize agent tool calls and actions |
| `AgentConfigPanel` | `executions/` | Agent selection and configuration |
| `AgentSelector` | `executions/` | Dropdown for agent types |
| `AgentSettingsDialog` | `executions/` | Global agent settings |
| `ClaudeCodeConfigForm` | `executions/` | Claude Code specific config form |
| `CodexConfigForm` | `executions/` | Codex specific config form |
| `CopilotConfigForm` | `executions/` | Copilot specific config form |
| `CursorConfigForm` | `executions/` | Cursor specific config form |
| `GeminiConfigForm` | `executions/` | Gemini specific config form |
| `OpencodeConfigForm` | `executions/` | Opencode specific config form |
| `BranchSelector` | `executions/` | Git branch selection dropdown |
| `CodeChangesPanel` | `executions/` | File list with change stats (A/M/D/R) |
| `DiffViewer` | `executions/` | Unified diff rendering via @git-diff-view/react |
| `CommitChangesDialog` | `executions/` | Commit worktree changes |
| `SyncPreviewDialog` | `executions/` | Preview sync before execution |
| `FollowUpDialog` | `executions/` | Create follow-up executions |
| `AdhocExecutionDialog` | `executions/` | Create execution without linked issue |
| `CleanupWorktreeDialog` | `executions/` | Clean up completed worktree |
| `DeleteWorktreeDialog` | `executions/` | Delete worktree confirmation |
| `DeleteExecutionDialog` | `executions/` | Delete execution confirmation |
| `MessageStream` | `executions/` | Real-time message display |
| `PermissionRequest` | `executions/` | Agent permission request UI |
| `TodoTracker` | `executions/` | Execution TODO tracking |
| `ToolCallViewer` | `executions/` | Agent tool call details |

### Issues (9 components)

| Component | File | Purpose |
|-----------|------|---------|
| `IssueCard` | `issues/` | Issue display card |
| `IssueEditor` | `issues/` | Rich text issue editor (Tiptap) |
| `IssuePanel` | `issues/` | Issue detail panel |
| `IssueKanbanBoard` | `issues/` | Kanban board with drag-and-drop (@dnd-kit) |
| `CreateIssueDialog` | `issues/` | New issue dialog |
| `DeleteIssueDialog` | `issues/` | Delete confirmation |
| `ActivityTimeline` | `issues/` | Issue activity history |
| `SyncIndicator` | `issues/` | Sync status indicator |
| `WorkflowIndicator` | `issues/` | Workflow status badge |

### Specs (17 components)

| Component | File | Purpose |
|-----------|------|---------|
| `SpecCard` | `specs/` | Spec card in list view |
| `SpecList` | `specs/` | Spec list with filtering |
| `SpecEditor` | `specs/` | Markdown spec editor |
| `SpecViewer` | `specs/` | Rendered markdown spec viewer |
| `SpecViewerTiptap` | `specs/` | Tiptap-based spec viewer with rich formatting |
| `SpecFeedbackPanel` | `specs/` | Feedback panel for spec detail |
| `AlignedFeedbackPanel` | `specs/` | Position-aligned feedback overlay |
| `AddFeedbackDialog` | `specs/` | Add new feedback dialog |
| `FeedbackAnchor` | `specs/` | Feedback anchor indicator |
| `FeedbackCard` | `specs/` | Feedback card display |
| `FeedbackForm` | `specs/` | Feedback input form |
| `DeleteSpecDialog` | `specs/` | Delete confirmation |
| `MarkdownLine` | `specs/` | Individual markdown line renderer |
| `TableOfContentsPanel` | `specs/` | Spec TOC navigation |
| `TableWithControls` | `specs/` | Table with interactive controls |
| `TiptapEditor` | `specs/` | Tiptap rich text editor integration |
| `TiptapMarkdownViewer` | `specs/` | Tiptap markdown viewer |

**Tiptap Extensions (2):**
- `EntityMention` -- Entity mention extension
- `EntityMentionComponent` -- Mention rendering component

### Workflows (13 components)

| Component | File | Purpose |
|-----------|------|---------|
| `WorkflowCard` | `workflows/` | Workflow summary card |
| `WorkflowControls` | `workflows/` | Start/pause/cancel controls |
| `WorkflowDAG` | `workflows/` | Dependency graph visualization (React Flow + dagre layout) |
| `WorkflowStepNode` | `workflows/` | DAG node for workflow step |
| `WorkflowStepPanel` | `workflows/` | Step detail panel |
| `CreateWorkflowDialog` | `workflows/` | New workflow dialog |
| `DeleteWorkflowDialog` | `workflows/` | Delete confirmation |
| `DeleteAllWorkflowsDialog` | `workflows/` | Bulk delete |
| `ResumeWorkflowDialog` | `workflows/` | Resume paused workflow |
| `EscalationBanner` | `workflows/` | Human-in-the-loop alert banner |
| `EscalationPanel` | `workflows/` | Escalation detail/response panel |
| `OrchestratorGuidancePanel` | `workflows/` | Orchestrator agent guidance |
| `OrchestratorTrajectory` | `workflows/` | Orchestrator action visualization |

### BMAD (17 components)

| Component | File | Purpose |
|-----------|------|---------|
| `BmadPhaseTracker` | `bmad/` | Phase progress tracker |
| `BmadArtifactChecklist` | `bmad/` | Artifact completion checklist |
| `BmadActiveAgentPanel` | `bmad/` | Currently active agent/persona panel |
| `BmadNextStepPanel` | `bmad/` | Next recommended step panel |
| `BmadStoryCard` | `bmad/` | Story card for sprint board |
| `BmadEpicFilter` | `bmad/` | Epic filter dropdown |
| `BmadWorkflowNode` | `bmad/` | Pipeline DAG workflow node |
| `BmadGateNode` | `bmad/` | Pipeline DAG quality gate node |
| `BmadStoryDetailPanel` | `bmad/` | Story detail panel |
| `BmadStoryCycleRing` | `bmad/` | Story cycle visualization ring |
| `BmadSprintBoard` | `bmad/` | Sprint board with story columns |
| `BmadPhaseGroupNode` | `bmad/` | Phase group node for pipeline DAG |
| `BmadPersonaGrid` | `bmad/` | Grid of 9 BMAD personas |
| `BmadPersonaDetail` | `bmad/` | Persona detail view |
| `BmadGateOverview` | `bmad/` | Quality gate overview panel |
| `BmadGateChecklist` | `bmad/` | Gate checklist with pass/fail items |
| `BmadPipelineDAG` | `bmad/` | Full BMAD pipeline DAG (React Flow) |

### Chat Widget (6 components)

| Component | File | Purpose |
|-----------|------|---------|
| `ChatWidget` | `chat-widget/` | Main chat widget wrapper |
| `ChatWidgetContent` | `chat-widget/` | Chat content area |
| `ChatWidgetFAB` | `chat-widget/` | Floating action button |
| `ChatWidgetOverlay` | `chat-widget/` | Chat overlay |
| `ChatWidgetPanel` | `chat-widget/` | Chat panel |
| `ExecutionSelector` | `chat-widget/` | Select execution for chat |

### Import (7 components)

| Component | File | Purpose |
|-----------|------|---------|
| `ImportDialog` | `import/` | External entity import dialog |
| `ImportPreview` | `import/` | Preview imported entity |
| `ExternalLinkBadge` | `import/` | External system link badge |
| `ProviderIcon` | `import/` | Integration provider icon |
| `AlreadyImportedState` | `import/` | Already-imported indicator |
| `RefreshConflictDialog` | `import/` | Refresh conflict resolution |
| `StaleLinkWarning` | `import/` | Stale external link warning |

### Entities (3 components)

| Component | File | Purpose |
|-----------|------|---------|
| `EntityBadge` | `entities/` | Entity type/ID badge |
| `IssueHoverContent` | `entities/` | Issue hover card content |
| `SpecHoverContent` | `entities/` | Spec hover card content |

### Relationships (2 components)

| Component | File | Purpose |
|-----------|------|---------|
| `RelationshipForm` | `relationships/` | Create/edit relationship form |
| `RelationshipList` | `relationships/` | Relationship list display |

### Projects (2 components)

| Component | File | Purpose |
|-----------|------|---------|
| `DirectoryBrowser` | `projects/` | Directory browser for project selection |
| `ProjectSwitcher` | `projects/` | Project switching dropdown |

### Voice (3 components)

| Component | File | Purpose |
|-----------|------|---------|
| `VoiceInputButton` | `voice/` | Microphone toggle button (STT) |
| `VoiceNarrationToggle` | `voice/` | Narration on/off toggle (TTS) |
| `VoiceSpeakingIndicator` | `voice/` | Speaking state indicator |

### Routing (3 components)

| Component | File | Purpose |
|-----------|------|---------|
| `DefaultRoute` | `routing/` | Default route redirect |
| `LegacyRedirect` | `routing/` | Legacy URL redirect handler |
| `ProtectedRoute` | `routing/` | Route guard for project context |

### Layout (4 components)

| Component | File | Purpose |
|-----------|------|---------|
| `MainLayout` | `layout/` | App shell with sidebar |
| `Panel` | `layout/` | Resizable panel wrapper |
| `SettingsDialog` | `layout/` | Application settings |
| `HelpDialog` | `layout/` | Help/keyboard shortcuts dialog |

### UI Primitives (27 components, shadcn/ui pattern)

Built on Radix UI with TailwindCSS + class-variance-authority:

**Standard Radix wrappers:** `alert-dialog`, `badge`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `label`, `popover`, `radio-group`, `scroll-area`, `select`, `separator`, `sonner` (toasts), `switch`, `tabs`, `textarea`, `tooltip`

**Custom composites:** `context-search-dropdown`, `context-search-textarea`, `entity-combobox`, `issue-selector`, `multi-issue-selector`, `spec-selector`

## Total Component Count

| Domain | Count |
|--------|-------|
| Executions | 33 |
| Specs | 17 + 2 extensions |
| BMAD | 17 |
| Workflows | 13 |
| Issues | 9 |
| Import | 7 |
| Chat Widget | 6 |
| Layout | 4 |
| Voice | 3 |
| Entities | 3 |
| Routing | 3 |
| Relationships | 2 |
| Projects | 2 |
| UI Primitives | 27 |
| **Total** | **~148** |

## Frontend Hooks (37 hooks)

| Hook | Purpose |
|------|---------|
| `useAgentActions` | Compute contextual actions based on execution state |
| `useAgentCommands` | Agent command utilities |
| `useAgents` | Fetch available agents |
| `useBmadPersonas` | Fetch BMAD personas and status |
| `useBmadPipeline` | BMAD pipeline data and operations |
| `useCollisionFreePositions` | Layout positioning for overlapping elements |
| `useContextSearch` | Cross-reference search in editors |
| `useExecutionChanges` | Get file changes (committed + uncommitted) |
| `useExecutionLogs` | Stream execution logs in real-time |
| `useExecutionMutations` | Create/update/delete executions |
| `useExecutionSync` | Manage sync operations (preview/squash/preserve/stage) |
| `useExecutions` | Fetch root executions (React Query + WebSocket) |
| `useFeedback` | Feedback CRUD operations |
| `useFeedbackPositions` | Compute feedback positions for alignment |
| `useImport` | External entity import operations |
| `useIssueHoverData` | Issue hover card data fetching |
| `useIssueRelationships` | Issue relationship management |
| `useIssues` | Issue CRUD with React Query |
| `useKokoroTTS` | Kokoro text-to-speech integration |
| `usePersistedDraft` | Persist draft content across sessions |
| `useProject` | Current project context |
| `useProjectRoutes` | Project-scoped route generation |
| `useProjects` | Multi-project management |
| `useRefreshEntity` | Refresh external entity data |
| `useRelationshipMutations` | Create/delete relationships |
| `useRepositoryInfo` | Git repository information |
| `useSessionUpdateStream` | SSE stream for session updates |
| `useSpecHoverData` | Spec hover card data fetching |
| `useSpecRelationships` | Spec relationship management |
| `useSpecs` | Spec CRUD with React Query |
| `useUpdateCheck` | Check for application updates |
| `useVoiceConfig` | Voice settings configuration |
| `useVoiceInput` | Browser STT integration |
| `useVoiceNarration` | TTS narration via Kokoro |
| `useWorkflows` | Workflow CRUD and operations |
| `useWorktreeMutations` | Create/update/delete worktrees |
| `useWorktrees` | Fetch and manage worktrees |

## Frontend Contexts (4 contexts)

| Context | File | Purpose |
|---------|------|---------|
| `ProjectContext` | `contexts/` | Current project state, switching, project-scoped API |
| `WebSocketContext` | `contexts/` | Real-time message subscription with project-scoped handling and React Query invalidation |
| `ThemeContext` | `contexts/` | Theme management with 9 color themes |
| `ChatWidgetContext` | `contexts/` | Chat widget open/close state, execution binding |

## Key Libraries

| Library | Purpose | Used By |
|---------|---------|---------|
| TanStack React Query | Server state management, caching, invalidation | All hooks |
| @xyflow/react (React Flow) | DAG visualization | WorkflowDAG, BmadPipelineDAG |
| dagre | Automatic graph layout | Workflow/BMAD DAGs |
| @dnd-kit | Drag-and-drop | IssueKanbanBoard |
| Tiptap | Rich text editing | SpecEditor, IssueEditor, TiptapEditor |
| @git-diff-view/react | Diff rendering | DiffViewer |
| Zustand | Client-side state | Theme, sidebar state |
| Kokoro TTS | Text-to-speech synthesis | useKokoroTTS, VoiceNarrationToggle |
| Radix UI | Accessible UI primitives | All UI components |
| class-variance-authority | Variant-based component styling | UI primitives |
| Axios | HTTP client | All API calls |

## Color Themes (9 themes)

**Light (4):**
- `default-light`
- `github-light`
- `one-light`
- `solarized-light`

**Dark (5):**
- `default-dark`
- `dracula`
- `github-dark`
- `nord`
- `one-dark-pro`

## Real-Time Architecture

- WebSocket connection managed by `WebSocketContext`
- Project-scoped message filtering via `X-Project-ID` header
- WebSocket events trigger React Query cache invalidation
- Execution log streaming via SSE (`/api/executions/:id/stream`)
- Session updates via `useSessionUpdateStream`
