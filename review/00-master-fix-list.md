# BMAD Integration — Master Fix List

Compiled from 5 review reports (01-05).

---

## CRITICAL (5 issues — must fix before ship)

### C1. Missing `validate()` method on BmadProvider
**Source:** 01-plugin-core-review
**File:** `plugins/integration-bmad/src/plugin.ts`
**Problem:** sync-coordinator calls `provider.validate()` at startup. BmadProvider doesn't implement it → runtime crash on initialization.
**Fix:** Add `async validate(): Promise<PluginValidationResult>` method. Check that `_bmad-output/` exists and is readable.

### C2. `runBmadSkill()` routes to wrong endpoint
**Source:** 05-mcp-persona-review
**File:** `mcp/src/api-client.ts`
**Problem:** Routes to generic `POST /api/issues/:id/executions` instead of `POST /api/bmad/execute`. Persona prompt injection never happens — executions run without BMAD context.
**Fix:** Change to `POST /api/bmad/execute` with proper request body `{ issueId, persona, skill }`.

### C3. Duplicate axios instances in frontend hooks
**Source:** 04-frontend-review
**Files:** `frontend/src/hooks/useBmadPipeline.ts`, `useBmadPersonas.ts`
**Problem:** Create their own `axios.create()` instead of using shared `api` from `@/lib/api.ts`. Misses auth interceptors, error handling, and `X-Project-ID` header.
**Fix:** Import and use the shared `api` instance.

### C4. Persona key mismatch: `quick-flow-solo-dev` vs `quick-flow`
**Source:** 03-server-review
**Files:** `server/src/routes/bmad.ts` (uses `quick-flow-solo-dev`), `plugins/integration-bmad/src/persona-prompts.ts` (uses `quick-flow`)
**Problem:** Execution requests for Barry's persona will 400 because the key doesn't match.
**Fix:** Standardize on `quick-flow` everywhere (matching the plugin's BMAD_PERSONAS keys).

### C5. Watcher never emits `change_type: "created"`
**Source:** 02-parser-sync-review
**File:** `plugins/integration-bmad/src/watcher.ts`
**Problem:** New files always get `"updated"` because `existsSync()` returns true by the time the watcher fires. Sync coordinator only auto-imports on `"created"` → new BMAD artifacts won't auto-import.
**Fix:** Track known files in a Set. If a file path isn't in the Set when a change fires, emit `"created"`.

---

## IMPORTANT (10 issues — should fix)

### I1. `searchEntities()` missing `query` parameter
**Source:** 01-plugin-core-review
**File:** `plugins/integration-bmad/src/plugin.ts`
**Problem:** Interface expects `searchEntities(query?: string, options?: SearchOptions)`. Ours accepts no params.
**Fix:** Add `query?: string` param, filter results locally when provided.

### I2. Sprint writer destroys YAML formatting
**Source:** 02-parser-sync-review
**File:** `plugins/integration-bmad/src/writer/sprint-writer.ts`
**Problem:** `yaml.load()` → modify → `yaml.dump()` strips comments and changes formatting.
**Fix:** Use regex-based line replacement or a CST-preserving YAML library.

### I3. Watcher doesn't populate `data` field in ExternalChange
**Source:** 02-parser-sync-review
**File:** `plugins/integration-bmad/src/watcher.ts`
**Problem:** Without entity data, sync coordinator can't auto-import or apply updates.
**Fix:** Resolve entity data in the provider's watcher callback before forwarding changes.

### I4. Dev persona name: "Amos" vs "Amelia"
**Source:** 03-server-review, 05-mcp-persona-review
**File:** `server/src/routes/bmad.ts` line 102
**Problem:** BMAD spec says "Amelia", our persona-prompts.ts says "Amelia", but bmad.ts says "Amos".
**Fix:** Change to "Amelia" in bmad.ts.

### I5. Duplicate persona data in server routes
**Source:** 03-server-review
**File:** `server/src/routes/bmad.ts`
**Problem:** Maintains its own `BMAD_AGENTS` array instead of importing from plugin's `BMAD_PERSONAS`. Source of drift (C4, I4).
**Fix:** Import and derive from `@sudocode-ai/integration-bmad` exports.

### I6. `computeNextStep` assigns architecture to wrong phase
**Source:** 05-mcp-persona-review
**File:** `mcp/src/api-client.ts`
**Problem:** Architecture is mapped to "planning" but BMAD spec says it's Phase 3 "solutioning".
**Fix:** Move architecture step to solutioning phase in the logic.

### I7. No WebSocket integration in BMAD hooks
**Source:** 04-frontend-review
**Files:** `frontend/src/hooks/useBmadPipeline.ts`, `useBmadPersonas.ts`
**Problem:** No WebSocket subscriptions for real-time updates. UI won't reflect changes until staleTime (30s).
**Fix:** Add WebSocket message handlers that invalidate React Query cache, matching useWorkflows pattern.

### I8. `bmad_run_skill` optional `issue_id` vs required `issueId`
**Source:** 05-mcp-persona-review
**Files:** `mcp/src/tool-registry.ts`, `server/src/routes/bmad.ts`
**Problem:** MCP tool has optional `issue_id`, server route requires `issueId`.
**Fix:** Either make server accept optional issueId (for ad-hoc executions) or make MCP tool require it.

### I9. Raw SQL bypass in execution service
**Source:** 03-server-review
**File:** `server/src/services/bmad-execution-service.ts`
**Problem:** Direct DB write instead of using `updateExecution()`.
**Fix:** Use the proper service method.

### I10. Missing sprint components in barrel exports
**Source:** 04-frontend-review
**File:** `frontend/src/components/bmad/index.ts`
**Problem:** 4 sprint-related components not exported from barrel.
**Fix:** Add missing exports.

---

## MINOR (10+ issues)

### M1. Version drift: package.json 0.2.0 vs plugin.ts 0.1.0
### M2. `toSection` helper duplicated across 3 parser files
### M3. Performance: fetchEntity does full scan instead of index lookup
### M4. Missing `tech-spec` in artifact filename type detection
### M5. `any` typing in BmadSprintPage execution map
### M6. BmadNextStepPanel "Run" button has no click handler
### M7. Static `/agents` endpoint unnecessarily requires project context
### M8. String interpolation in SQL LIKE clause (gate service)
### M9. No issue existence pre-validation in `/execute`
### M10. Undocumented anti-oscillation coupling between writer and watcher
### M11. Inconsistent error response format in `/status` endpoint
### M12. `mapToSudocode` returns extra `relationships` field (harmless but interface mismatch)

---

## Fix Priority Order

1. **C1** (validate) + **C5** (watcher created) — Plugin won't initialize without these
2. **C2** (MCP endpoint) + **C4** (persona keys) — Core functionality broken
3. **C3** (axios) + **I4/I5** (persona drift) — Infrastructure consistency
4. **I1-I3** (interface compliance, sync correctness)
5. **I6-I10** (phase mapping, WebSocket, exports)
6. **M1-M12** (polish)
