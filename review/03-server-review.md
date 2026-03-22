# Server Review: BMAD Integration (Routes & Services)

**Reviewer:** server-reviewer
**Files Reviewed:**
- `server/src/routes/bmad.ts`
- `server/src/services/bmad-execution-service.ts`
- `server/src/services/bmad-gate-service.ts`
- `server/src/services/bmad-workflow-service.ts`
- `server/src/routes/projects.ts` (hasBmad additions)
- `server/src/services/project-context.ts` (hasBmad additions)
- `server/src/index.ts` (bmad route registration)

**Reference Patterns:**
- `server/src/routes/workflows.ts`, `executions.ts`, `plugins.ts`
- `server/src/services/execution-service.ts`, `integration-sync-service.ts`
- `types/src/workflows.d.ts`, `types/src/agents.d.ts`
- `plugins/integration-bmad/src/persona-prompts.ts`

**Docs Reviewed:**
- docs.sudocode.ai/web/overview, quickstart, issue-management, spec-management
- docs.sudocode.ai/examples/workflows
- docs.sudocode.ai/mcp/issue-execution

---

## Review Questions

### Q1: Do API routes follow existing route patterns? — PASS (minor issues)

The BMAD router in `bmad.ts` correctly follows established patterns:
- Uses `Router()` from Express ✓
- Accesses project context via `req.project!` (set by `requireProject` middleware) ✓
- Uses try/catch with `console.error` logging on failures ✓
- Returns `{ success: true, data: {...} }` for success responses ✓
- Uses 201 status for resource creation (`/execute`) ✓
- Input validation with 400 responses for bad requests ✓

**Minor:** Error response format is inconsistent within the file:
- `/status` error (line 357): `{ error: "Failed to get BMAD status" }` — missing `success: false`
- Other endpoints: `{ success: false, error: "..." }` — correct pattern
- This mirrors existing inconsistency in the codebase (plugins.ts also varies), but should be normalized.

### Q2: Does the workflow service generate valid WorkflowConfig objects? — PASS

`bmad-workflow-service.ts` generates configs with all required `WorkflowConfig` fields from `types/src/workflows.d.ts`:
- `engineType`: "sequential" | "orchestrator" ✓
- `parallelism`: "sequential" ✓
- `onFailure`: "pause" ✓ (valid `WorkflowFailureStrategy`)
- `autoCommitAfterStep`: true ✓
- `defaultAgentType`: "claude-code" ✓ (valid `AgentType`)
- `autonomyLevel`: "human_in_the_loop" ✓ (valid `WorkflowAutonomyLevel`)
- `baseBranch`: optional, correctly passed through ✓

The return type uses `Partial<WorkflowConfig>` which is appropriate for a template that can be customized before creation.

**Note:** Generated step `dependencies` contain string indices ("0", "1") rather than step IDs. This is intentional since the steps omit `id` via `Omit<WorkflowStep, "id" | ...>` — the actual IDs would be assigned when the workflow is created. This is a valid template pattern.

### Q3: Does the execution service correctly interface with ExecutionService.createExecution()? — PASS (minor concern)

`createBmadExecution()` correctly calls `executionService.createExecution()` with the right signature:
```typescript
executionService.createExecution(issueId, config, prompt, agentType)
```

Matches the `ExecutionService.createExecution(issueId: string | null, config: ExecutionConfig, prompt: string, agentType: AgentType)` signature ✓

The `ExecutionConfig` object correctly uses `appendSystemPrompt` (line 86), which is a supported field in the `ExecutionConfig` interface (line 78 of execution-service.ts) ✓

**Minor concern:** After creating the execution, the service performs a raw SQL `UPDATE executions SET step_config = ?` (line 105-108) to store BMAD metadata, bypassing the service layer. This works but:
- Violates the pattern of using `updateExecution()` from `executions.ts`
- Could desync if `updateExecution()` has side effects (WebSocket broadcasts, etc.)
- Recommend using `updateExecution(db, execution.id, { step_config: bmadStepConfig })` instead

### Q4: Does the gate service correctly use feedback and relationship operations? — PASS (minor concerns)

`bmad-gate-service.ts` correctly imports and uses CLI operations:
- `createFeedback(db, feedbackInput)` ✓
- `updateFeedback(db, fb.id, { dismissed: true })` ✓
- `listFeedback(db, { dismissed: false })` ✓
- `updateIssue(db, issue.id, { status: "blocked" })` ✓
- `addRelationship(db, { from_id, from_type, to_id, to_type, relationship_type, metadata })` ✓
- `removeRelationship(db, from_id, from_type, to_id, to_type, "blocks")` ✓

The feedback types ("request", "suggestion", "comment") map correctly to gate results (fail, concerns, pass).

**Minor concern 1:** The `resolveGate()` function (line 190-196) uses raw SQL with string interpolation in a LIKE clause:
```typescript
.all(`%"gateType":"${gateType}"%`)
```
While `gateType` is validated at the route handler level against a whitelist, the service function itself doesn't validate. If called from another context without prior validation, this is a potential SQL injection vector. Recommend using parameterized queries or adding validation within the service function.

**Minor concern 2:** The `from_id` field is not set in `CreateFeedbackInput`. The `agent` field is used instead to identify the source as `bmad-gate:{gateType}`. This is acceptable for agent-originated feedback (no issue is the "from" entity), but should be documented.

### Q5: Is project detection (hasBmad) consistent with existing patterns? — PASS

**project-context.ts (getSummary):**
```typescript
hasBmad: existsSync(bmadDir),
hasBmadConfig: existsSync(bmadConfigDir),
hasBmadOutput: existsSync(bmadOutputDir),
```
Uses synchronous `existsSync()` — consistent with how the class already works (it's a synchronous method) ✓

**projects.ts (browse endpoint):**
```typescript
await fs.access(path.join(entryPath, "_bmad"));
hasBmad = true;
```
Uses async `fs.access()` — consistent with the existing `hasSudocode` check in the same endpoint ✓

Both patterns are correctly placed and mirror how `hasSudocode` / `.sudocode` detection works.

### Q6: Are route registrations in index.ts correct? — PASS

```typescript
app.use("/api/bmad", requireProject(projectManager), createBmadRouter());
```

- Mount path `/api/bmad` ✓
- `requireProject(projectManager)` middleware applied ✓ (BMAD routes need project context)
- Placed among other project-requiring routes ✓
- Import at top of file: `import { createBmadRouter } from "./routes/bmad.js"` ✓

This follows the exact pattern of workflows, plugins, and other routes.

### Q7: Do response formats match what existing routes return? — PASS (minor inconsistency)

Success responses consistently use `{ success: true, data: {...} }` ✓
The `/execute` endpoint correctly returns 201 for creation ✓

**Minor:** As noted in Q1, the `/status` error handler at line 357 returns `{ error: "..." }` without `success: false`, while all other error handlers include it. This should be normalized to `{ success: false, error: "..." }`.

### Q8: Are there missing error handlers or edge cases? — PASS (minor gaps)

All routes have try/catch blocks ✓
Input validation for required fields is present in `/gate`, `/gate/resolve`, `/execute` ✓

**Edge cases to consider:**

1. **`/execute` — Issue existence not validated:** The `issueId` is passed directly to `createBmadExecution()` without checking if it exists in the database first. The underlying `ExecutionService.createExecution()` does a lookup, but if the issue doesn't exist, the error message may be unclear. Other execution creation endpoints (in `executions.ts`) also don't pre-validate, so this is consistent but could be improved.

2. **`/import` — Plugin not configured:** If the BMAD plugin isn't configured in config.json, `syncProvider("bmad")` may throw with a confusing error. The catch block handles it, but a pre-check would give a better UX.

3. **`/gate` — Empty items array:** If `items` is an empty array, the function succeeds but creates no feedback. This is arguably correct behavior but could return a warning.

4. **`/agents` — Static data, no project context used:** The `/agents` endpoint ignores `req.project` entirely. It could potentially be mounted without `requireProject`, but this is a minor design choice, not a bug.

### Q9: Does the workflow template match BMAD's actual 4-phase structure? — PASS

Phase mapping:
| Phase | Service | BMAD Spec | Match |
|-------|---------|-----------|-------|
| 1. Discovery | brainstorming → domain-research, market-research → product-brief | brainstorming → research → product-brief | ✓ (splits research into domain + market) |
| 2. Planning | prd → ux-design, architecture | PRD → UX-design → architecture | ✓ |
| 3. Preparation | epics-stories → readiness-check | epics → readiness-check | ✓ |
| 4. Execution | sprint-planning → create-story → dev-story → code-review → retrospective | sprint-planning → (create-story → dev-story → code-review)* → retrospective | ✓ |

Engine types are correct:
- Phases 1-3: `sequential` ✓
- Phase 4: `orchestrator` ✓ (story cycle repeats dynamically)

Phase 4 step structure is linear rather than cyclic (the cycle is handled by the orchestrator at runtime), which is the correct pattern for orchestrator-managed workflows.

### Q10: Are BMAD persona names consistent with persona-prompts.ts? — FAIL

**CRITICAL: Persona key mismatch between bmad.ts and persona-prompts.ts:**

| bmad.ts BMAD_AGENTS key | persona-prompts.ts key | Match |
|-------------------------|------------------------|-------|
| `analyst` | `analyst` | ✓ |
| `pm` | `pm` | ✓ |
| `architect` | `architect` | ✓ |
| `ux-designer` | `ux-designer` | ✓ |
| `sm` | `sm` | ✓ |
| `dev` | `dev` | ✓ |
| `qa` | `qa` | ✓ |
| `tech-writer` | `tech-writer` | ✓ |
| **`quick-flow-solo-dev`** | **`quick-flow`** | **MISMATCH** |

If the frontend sends `quick-flow-solo-dev` (from the BMAD_AGENTS static list in `bmad.ts`) to the `/execute` endpoint, the `BMAD_PERSONAS["quick-flow-solo-dev"]` lookup will fail because the key in `persona-prompts.ts` is `quick-flow`.

**IMPORTANT: Display name mismatch for dev persona:**

| Field | bmad.ts BMAD_AGENTS | persona-prompts.ts BMAD_PERSONAS |
|-------|--------------------|---------------------------------|
| dev displayName/name | **"Amos"** | **"Amelia"** |

The dev persona is named "Amos" in the route's static BMAD_AGENTS array but "Amelia" in the plugin's BMAD_PERSONAS. This creates a data inconsistency — the `/agents` endpoint returns "Amos" but executions use "Amelia" in prompts.

**IMPORTANT: Duplicate persona data source:**
The `bmad.ts` route file defines its own `BMAD_AGENTS` array (lines 44-144) with hardcoded persona data, while the actual source of truth is `BMAD_PERSONAS` from `@sudocode-ai/integration-bmad`. This duplication is a maintenance hazard — the route should derive its `/agents` response from `BMAD_PERSONAS` instead of maintaining a separate copy.

---

## Findings Summary

### CRITICAL

1. **Persona key mismatch: `quick-flow-solo-dev` vs `quick-flow`** (`bmad.ts:134` vs `persona-prompts.ts:196`)
   - The BMAD_AGENTS static array in the route uses `quick-flow-solo-dev` but BMAD_PERSONAS uses `quick-flow`
   - Will cause 400 errors when trying to execute with this persona
   - **Fix:** Align keys — either rename to `quick-flow` in bmad.ts or `quick-flow-solo-dev` in persona-prompts.ts (prefer updating bmad.ts to match the plugin's canonical names)

### IMPORTANT

2. **Dev persona display name mismatch: "Amos" vs "Amelia"** (`bmad.ts:103` vs `persona-prompts.ts:154`)
   - Frontend will show "Amos" from `/agents` but execution prompts will use "Amelia"
   - **Fix:** Align to one name (check BMAD reference docs for canonical name)

3. **Duplicate persona data in route file** (`bmad.ts:44-144`)
   - BMAD_AGENTS array duplicates data from BMAD_PERSONAS, creating drift risk
   - **Fix:** Derive `/agents` response from `BMAD_PERSONAS` imported from `@sudocode-ai/integration-bmad`. Transform at runtime:
   ```typescript
   const agents = Object.values(BMAD_PERSONAS).map(p => ({
     name: p.id,
     displayName: p.name,
     role: p.role,
     capabilities: p.skills.map(s => s.description),
   }));
   ```

4. **Raw SQL bypass in bmad-execution-service.ts** (line 105-108)
   - Direct `UPDATE executions SET step_config = ?` bypasses service layer
   - **Fix:** Use `updateExecution(db, execution.id, { step_config: bmadStepConfig })` from `executions.ts`

### MINOR

5. **Inconsistent error response in /status endpoint** (`bmad.ts:357`)
   - Returns `{ error: "..." }` without `success: false` field
   - **Fix:** Change to `{ success: false, error: "Failed to get BMAD status" }`

6. **String interpolation in SQL LIKE clause** (`bmad-gate-service.ts:196`)
   - `gateType` is interpolated into LIKE pattern without parameterization within the service
   - Mitigated by route-level validation but fragile
   - **Fix:** Add validation within `resolveGate()` or use parameterized query

7. **No issue existence pre-validation in /execute** (`bmad.ts:607`)
   - `issueId` not verified before passing to execution service
   - Consistent with existing patterns but could give confusing errors
   - **Fix:** Optional — add a quick `SELECT id FROM issues WHERE id = ?` check

8. **Static /agents endpoint doesn't need project context** (`bmad.ts:366`)
   - The response is entirely static data, yet the route requires `requireProject` middleware
   - Not a bug, but mounting separately (like `/api/agents`) would be more accurate

---

## Cross-Cutting Concerns

- **For MCP/persona reviewer (Task #5):** The persona key mismatch (`quick-flow-solo-dev` vs `quick-flow`) and dev name mismatch ("Amos" vs "Amelia") likely affect MCP tools as well if they reference persona IDs. Verify consistency across `mcp/src/server.ts` BMAD tool definitions.

- **For frontend reviewer (Task #4):** The `/agents` endpoint returns static data from a duplicate BMAD_AGENTS array. If the frontend uses these names for display while executions use different names from BMAD_PERSONAS, users will see inconsistencies. Verify the frontend's persona display logic.

- **For plugin reviewer (Task #1):** The `BMAD_PERSONAS` export from `@sudocode-ai/integration-bmad` is the canonical data source. Confirm `quick-flow` is the intended key (not `quick-flow-solo-dev`) and whether the dev persona should be "Amelia" or "Amos".
