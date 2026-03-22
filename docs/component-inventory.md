# Component Inventory

> Generated: 2026-03-21 | Scan Level: Exhaustive

## Frontend Components (frontend/src/components/)

### Executions (~30 components)

| Component | Purpose |
|-----------|---------|
| `ExecutionsGrid` | CSS Grid container for execution chain tiles |
| `ExecutionChainTile` | Compact tile showing execution chain in grid |
| `ExecutionView` | Full detail view with follow-up chain |
| `ExecutionMonitor` | Real-time status monitoring |
| `ExecutionPreview` | Lightweight execution preview |
| `ExecutionHistory` | Execution history list |
| `ExecutionStatusBadge` | Status indicator badge |
| `ExecutionsSidebar` | Filtering, visibility, status display |
| `InlineExecutionView` | Inline execution within issue view |
| `AgentTrajectory` | Visualize agent tool calls and actions |
| `AgentConfigPanel` | Agent selection and configuration |
| `AgentSelector` | Dropdown for agent types |
| `AgentSettingsDialog` | Global agent settings |
| `ClaudeCodeConfigForm` | Claude Code specific config form |
| `CodexConfigForm` | Codex specific config form |
| `CopilotConfigForm` | Copilot specific config form |
| `CursorConfigForm` | Cursor specific config form |
| `GeminiConfigForm` | Gemini specific config form |
| `OpencodeConfigForm` | Opencode specific config form |
| `BranchSelector` | Git branch selection dropdown |
| `CodeChangesPanel` | File list with change stats (A/M/D/R) |
| `DiffViewer` | Unified diff rendering (@git-diff-view/react) |
| `CommitChangesDialog` | Commit worktree changes |
| `SyncPreviewDialog` | Preview sync before execution |
| `FollowUpDialog` | Create follow-up executions |
| `AdhocExecutionDialog` | Create execution without linked issue |
| `CleanupWorktreeDialog` | Clean up completed worktree |
| `DeleteWorktreeDialog` | Delete worktree confirmation |
| `DeleteExecutionDialog` | Delete execution confirmation |
| `MessageStream` | Real-time message display |
| `PermissionRequest` | Agent permission request UI |
| `TodoTracker` | Execution TODO tracking |
| `ToolCallViewer` | Agent tool call details |

### Issues (~8 components)

| Component | Purpose |
|-----------|---------|
| `IssueCard` | Issue display card |
| `IssueEditor` | Rich text issue editor (Tiptap) |
| `IssuePanel` | Issue detail panel |
| `IssueKanbanBoard` | Kanban board view for issues |
| `CreateIssueDialog` | New issue dialog |
| `DeleteIssueDialog` | Delete confirmation |
| `ActivityTimeline` | Issue activity history |
| `SyncIndicator` | Sync status indicator |
| `WorkflowIndicator` | Workflow status badge |

### Workflows (~12 components)

| Component | Purpose |
|-----------|---------|
| `WorkflowCard` | Workflow summary card |
| `WorkflowControls` | Start/pause/cancel controls |
| `WorkflowDAG` | Dependency graph visualization (React Flow) |
| `WorkflowStepNode` | DAG node for workflow step |
| `WorkflowStepPanel` | Step detail panel |
| `CreateWorkflowDialog` | New workflow dialog |
| `DeleteWorkflowDialog` | Delete confirmation |
| `DeleteAllWorkflowsDialog` | Bulk delete |
| `ResumeWorkflowDialog` | Resume paused workflow |
| `EscalationBanner` | Human-in-the-loop alert banner |
| `EscalationPanel` | Escalation detail/response panel |
| `OrchestratorGuidancePanel` | Orchestrator agent guidance |
| `OrchestratorTrajectory` | Orchestrator action visualization |

### Worktrees (~3 components)

| Component | Purpose |
|-----------|---------|
| `WorktreeList` | List all worktrees with search/filter |
| `WorktreeCard` | Individual worktree display |
| `WorktreeDetailPanel` | Detail panel with sync options |

### Import (~7 components)

| Component | Purpose |
|-----------|---------|
| `ImportDialog` | External entity import dialog |
| `ImportPreview` | Preview imported entity |
| `ExternalLinkBadge` | External system link badge |
| `ProviderIcon` | Integration provider icon |
| `AlreadyImportedState` | Already-imported indicator |
| `RefreshConflictDialog` | Refresh conflict resolution |
| `StaleLinkWarning` | Stale external link warning |

### Chat Widget (~6 components)

| Component | Purpose |
|-----------|---------|
| `ChatWidget` | Main chat widget wrapper |
| `ChatWidgetContent` | Chat content area |
| `ChatWidgetFAB` | Floating action button |
| `ChatWidgetOverlay` | Chat overlay |
| `ChatWidgetPanel` | Chat panel |
| `ExecutionSelector` | Select execution for chat |

### Voice (~3 components)

| Component | Purpose |
|-----------|---------|
| `VoiceInputButton` | Microphone toggle button |
| `VoiceNarrationToggle` | Narration on/off toggle |
| `VoiceSpeakingIndicator` | Speaking state indicator |

### Layout (~5 components)

| Component | Purpose |
|-----------|---------|
| `MainLayout` | App shell with sidebar |
| `Sidebar` | Navigation sidebar |
| `Panel` | Resizable panel wrapper |
| `SettingsDialog` | Application settings |
| `HelpDialog` | Help/keyboard shortcuts dialog |

### UI Primitives (shadcn/ui pattern)

Built on Radix UI with TailwindCSS + class-variance-authority:

`alert-dialog`, `badge`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `label`, `popover`, `radio-group`, `scroll-area`, `select`, `separator`, `switch`, `tabs`, `textarea`, `tooltip`, `sonner` (toasts)

Custom composites: `context-search-dropdown`, `context-search-textarea`, `entity-combobox`, `issue-selector`, `multi-issue-selector`, `kanban`

## Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| `ExecutionsPage` | `/executions` | Multi-execution grid view |
| `ExecutionDetailPage` | `/executions/:id` | Single execution detail |
| `IssuesPage` | `/issues` | Issues list + detail |
| `SpecsPage` | `/specs` | Specs list + detail |
| `WorkflowsPage` | `/workflows` | Workflow management + DAG |
| `WorktreesPage` | `/worktrees` | Worktree management |
| `ArchivedIssuesPage` | `/archived` | Archived issues |
| `ProjectsPage` | `/projects` | Multi-project management |

## Frontend Hooks

| Hook | Purpose |
|------|---------|
| `useExecutions` | Fetch root executions (React Query + WebSocket) |
| `useExecutionChanges` | Get file changes (committed + uncommitted) |
| `useExecutionSync` | Manage sync operations (preview/squash/preserve/stage) |
| `useExecutionLogs` | Stream execution logs in real-time |
| `useExecutionMutations` | Create/update/delete executions |
| `useAgents` | Fetch available agents |
| `useAgentActions` | Compute contextual actions based on execution state |
| `useAgentCommands` | Agent command utilities |
| `useWorktrees` | Fetch and manage worktrees |
| `useWorkflows` | Workflow CRUD and operations |
| `useContextSearch` | Cross-reference search in editors |
| `useCollisionFreePositions` | Layout positioning |

## Frontend Contexts

| Context | Purpose |
|---------|---------|
| `WebSocketContext` | Real-time message subscription (project-aware) |
| `ProjectContext` | Current project state and switching |
| `ThemeContext` | Dark/light theme toggle |
| `ChatWidgetContext` | Chat widget open/close state |
