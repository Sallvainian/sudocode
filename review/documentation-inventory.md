# BMAD Integration Review — Documentation Inventory

## Documentation Sources

### docs.sudocode.ai (57 pages)

#### CLI (27 pages)
- https://docs.sudocode.ai/cli/overview
- https://docs.sudocode.ai/cli/init
- https://docs.sudocode.ai/cli/sync
- https://docs.sudocode.ai/cli/ready
- https://docs.sudocode.ai/cli/blocked
- https://docs.sudocode.ai/cli/status
- https://docs.sudocode.ai/cli/stats
- https://docs.sudocode.ai/cli/spec-create
- https://docs.sudocode.ai/cli/spec-list
- https://docs.sudocode.ai/cli/spec-show
- https://docs.sudocode.ai/cli/spec-update
- https://docs.sudocode.ai/cli/spec-delete
- https://docs.sudocode.ai/cli/issue-create
- https://docs.sudocode.ai/cli/issue-list
- https://docs.sudocode.ai/cli/issue-show
- https://docs.sudocode.ai/cli/issue-update
- https://docs.sudocode.ai/cli/issue-delete
- https://docs.sudocode.ai/cli/link
- https://docs.sudocode.ai/cli/add-ref
- https://docs.sudocode.ai/cli/export
- https://docs.sudocode.ai/cli/import
- https://docs.sudocode.ai/cli/feedback-add
- https://docs.sudocode.ai/cli/feedback-list
- https://docs.sudocode.ai/cli/feedback-show
- https://docs.sudocode.ai/cli/feedback-dismiss
- https://docs.sudocode.ai/cli/feedback-relocate
- https://docs.sudocode.ai/cli/feedback-stale

#### Concepts (5 pages)
- https://docs.sudocode.ai/concepts/specs
- https://docs.sudocode.ai/concepts/issues
- https://docs.sudocode.ai/concepts/relationships
- https://docs.sudocode.ai/concepts/feedback
- https://docs.sudocode.ai/concepts/storage-model

#### Examples (5 pages)
- https://docs.sudocode.ai/examples/spec-breakdown
- https://docs.sudocode.ai/examples/spec-driven-development
- https://docs.sudocode.ai/examples/test-driven-debugging
- https://docs.sudocode.ai/examples/tracking-work-agentically
- https://docs.sudocode.ai/examples/workflows

#### MCP (7 pages)
- https://docs.sudocode.ai/mcp/overview
- https://docs.sudocode.ai/mcp/quick-start
- https://docs.sudocode.ai/mcp/agent-best-practices
- https://docs.sudocode.ai/mcp/issue-creation
- https://docs.sudocode.ai/mcp/issue-execution
- https://docs.sudocode.ai/mcp/multi-agent
- https://docs.sudocode.ai/mcp/spec-creation

#### Web UI (4 pages)
- https://docs.sudocode.ai/web/overview
- https://docs.sudocode.ai/web/quickstart
- https://docs.sudocode.ai/web/issue-management
- https://docs.sudocode.ai/web/spec-management

#### General (4 pages)
- https://docs.sudocode.ai/introduction
- https://docs.sudocode.ai/quickstart
- https://docs.sudocode.ai/why-sudocode
- https://docs.sudocode.ai/roadmap

### GitHub Source (Reference Implementations)

#### Types Package
- `types/src/integrations.d.ts` — IntegrationPlugin, IntegrationProvider, ExternalEntity, ExternalRelationship, ExternalChange interfaces
- `types/src/index.d.ts` — Spec, Issue, ExternalLink, IssueStatus, RelationshipType, SyncDirection
- `types/src/agents.d.ts` — AgentType, ClaudeCodeConfig, BaseAgentConfig
- `types/src/workflows.d.ts` — WorkflowConfig, WorkflowStep, WorkflowSource, WorkflowStatus
- `types/src/schema.ts` — Database schema definitions
- `types/src/artifacts.d.ts` — FileChangeStat, ChangesSnapshot, ExecutionChangesResult

#### CLI Integration System
- `cli/src/integrations/plugin-loader.ts` — FIRST_PARTY_PLUGINS, loadPlugin(), resolvePluginPath()
- `cli/src/integrations/sync-coordinator.ts` — SyncCoordinator (what calls provider methods)
- `cli/src/integrations/base-provider.ts` — BaseIntegrationProvider abstract class
- `cli/src/integrations/registry.ts` — DefaultProviderRegistry
- `cli/src/integrations/config-validator.ts` — Config validation
- `cli/src/operations/external-links.ts` — createIssueFromExternal(), createSpecFromExternal()

#### Existing Plugins (Reference Patterns)
- `plugins/integration-openspec/src/index.ts` — Closest pattern (file-based, multi-entity, markdown parsing, watcher, bidirectional)
- `plugins/integration-beads/src/index.ts` — Simplest pattern (JSONL-based, watcher)
- `plugins/integration-speckit/src/relationship-mapper.ts` — Relationship mapping pattern

#### MCP Package
- `mcp/src/server.ts` — Tool routing (handleCliTool, handleApiTool)
- `mcp/src/scopes.ts` — Scope system (ALL_SCOPES, META_SCOPE_EXPANSIONS, SERVER_REQUIRED_SCOPES)
- `mcp/src/tool-registry.ts` — Tool definitions (ALL_TOOLS array)
- `mcp/src/api-client.ts` — SudocodeAPIClient

#### Server Package
- `server/src/routes/workflows.ts`, `executions.ts`, `plugins.ts` — Route patterns
- `server/src/services/execution-service.ts` — Execution creation pattern
- `server/src/services/integration-sync-service.ts` — How sync is triggered server-side
- `server/src/index.ts` — Route registration pattern

#### Frontend Package
- `frontend/src/components/workflows/WorkflowDAG.tsx` — React Flow + dagre pattern
- `frontend/src/components/workflows/WorkflowStepNode.tsx` — Custom node rendering
- `frontend/src/components/workflows/WorkflowStepPanel.tsx` — Detail panel pattern
- `frontend/src/components/ui/kanban/` — KanbanProvider/Board/Card infrastructure
- `frontend/src/components/issues/IssueKanbanBoard.tsx` — Kanban with issues
- `frontend/src/pages/WorkflowsPage.tsx`, `WorkflowDetailPage.tsx` — Page layout patterns
- `frontend/src/hooks/useWorkflows.ts`, `useExecutions.ts` — React Query + WebSocket hooks
- `frontend/src/types/workflow.ts` — STEP_STATUS_STYLES, status constants

### LLMs Full-Text References
- `review/sudocode-llms-full.txt` (26,936 lines) — Complete sudocode documentation in one file: all 57 docs pages, CLI commands, concepts, MCP tools, web UI, examples
- `bmad-llms-full.txt` (2,734 lines) — Complete BMAD documentation: artifact formats, workflow definitions, persona specifications, phase structure
