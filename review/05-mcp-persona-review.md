# Review 05: MCP Tools & Persona Prompts

**Reviewer:** mcp-persona-reviewer
**Files Reviewed:**
- `mcp/src/scopes.ts`
- `mcp/src/tool-registry.ts`
- `mcp/src/api-client.ts`
- `mcp/src/server.ts`
- `plugins/integration-bmad/src/persona-prompts.ts`
- `server/src/routes/bmad.ts` (server-side reference)
- `types/src/agents.d.ts` (ClaudeCodeConfig reference)
- `bmad-llms-full.txt` (BMAD spec reference)

---

## Question-by-Question Review

### Q1: Does the bmad scope follow existing scope patterns?
**PASS**

The `bmad` scope is correctly integrated into all required scope infrastructure:
- Added to `ALL_SCOPES` array (scopes.ts:61)
- Added to `SERVER_REQUIRED_SCOPES` array (scopes.ts:77)
- Added to `META_SCOPE_EXPANSIONS["all"]` (scopes.ts:96)
- Added to `SCOPE_TOOLS` record with 3 tools (scopes.ts:157)
- NOT added to `"project-assistant"` meta-scope — this is correct since BMAD is an optional integration, not core project management.

Pattern is identical to how `voice`, `overview`, and other extended scopes are defined.

---

### Q2: Do the 3 BMAD tool definitions follow the exact tool schema pattern?
**PASS**

All 3 BMAD tools in `tool-registry.ts:762-817` follow the `ToolDefinition` interface exactly:
- `bmad_status` — no required params, empty properties (matches `ready` and `project_status` pattern)
- `bmad_next_step` — no required params, empty properties (same pattern)
- `bmad_run_skill` — has `properties` with typed fields, `required: ["skill"]`

Each has: `name`, `description`, `scope: "bmad"`, and `inputSchema` with `type: "object"`. Descriptions are clear and actionable for AI agents.

The tools are included in `ALL_TOOLS` via the `...BMAD_TOOLS` spread (tool-registry.ts:835).

---

### Q3: Do API client methods match the server route signatures exactly?
**FAIL — CRITICAL**

#### Issue 1: `runBmadSkill` bypasses the dedicated BMAD execution endpoint

The API client's `runBmadSkill()` (api-client.ts:778-793) routes to:
- `POST /api/issues/:id/executions` (with issue_id)
- `POST /api/executions` (without issue_id)

But the server has a **dedicated** endpoint at `POST /api/bmad/execute` (bmad.ts:593) that:
1. Validates the persona against `BMAD_PERSONAS`
2. Calls `createBmadExecution()` which injects the persona system prompt via `getPersonaConfig()`
3. Accepts `persona`, `skill`, `mode`, `baseBranch` parameters

By using the generic execution endpoints, **the persona prompt injection is completely bypassed**. The execution runs without any BMAD persona context. This defeats the core purpose of the BMAD persona system.

**Fix:** Change `runBmadSkill()` to call `POST /api/bmad/execute`:
```typescript
async runBmadSkill(params: BmadRunSkillParams): Promise<unknown> {
  const persona = params.persona || SKILL_PERSONA_MAP[params.skill] || "dev";
  return this.request("POST", "/api/bmad/execute", {
    issueId: params.issue_id,
    persona,
    skill: params.skill,
    agentType: params.agent_type || "claude-code",
  });
}
```

Note: The `bmad_run_skill` tool's `issue_id` is optional, but `POST /api/bmad/execute` requires `issueId`. Either the MCP tool should make `issue_id` required, or the server endpoint should be updated to support adhoc execution without an issue.

#### Issue 2: `getBmadNextStep` computes client-side but duplicates server logic

`getBmadNextStep()` fetches `/api/bmad/status` and `/api/bmad/artifacts` then calls `computeNextStep()` locally in the MCP package. The server's `detectPhase()` in bmad.ts does similar logic. This works but creates a maintenance risk — phase logic exists in two places.

---

### Q4: Do persona prompts accurately reflect the BMAD persona specs?
**PASS with IMPORTANT issues**

#### Names and Roles — Verified against bmad-llms-full.txt reference/agents.md:

| Persona | persona-prompts.ts | BMAD Spec | Match? |
|---------|-------------------|-----------|--------|
| Analyst | Mary, Strategic Business Analyst | Mary, Analyst | ✓ |
| PM | John, Product Manager | John, Product Manager | ✓ |
| Architect | Winston, System Architect | Winston, Architect | ✓ |
| UX Designer | Sally, UX Designer | Sally, UX Designer | ✓ |
| SM | Bob, Scrum Master | Bob, Scrum Master | ✓ |
| Dev | **Amelia**, Senior Software Engineer | **Amelia**, Developer | ✓ |
| QA | Quinn, QA Engineer | Quinn, QA Engineer | ✓ |
| Quick Flow | Barry, Full-Stack Developer | Barry, Quick Flow Solo Dev | ✓ |
| Tech Writer | Paige, Technical Writer | Paige, Technical Writer | ✓ |

#### IMPORTANT: Name inconsistency in server/src/routes/bmad.ts

In `server/src/routes/bmad.ts:102`, the dev persona's `displayName` is **"Amos"**, but in `persona-prompts.ts:153` and the BMAD spec, it's **"Amelia"**. This is a data inconsistency between the server route's static `BMAD_AGENTS` array and the canonical `BMAD_PERSONAS` from the plugin.

**Fix:** Change `server/src/routes/bmad.ts:102` from `"Amos"` to `"Amelia"`.

#### Skill mappings — Verified against BMAD spec:

The `SKILL_PERSONA_MAP` in api-client.ts and skill lists in persona-prompts.ts generally match the BMAD reference. Analyst triggers (BP, MR, DR, TR, CB, DP), PM triggers (CP, VP, EP, CE, IR, CC), etc. all align.

The analyst persona in persona-prompts.ts includes Technical Research (TR) which isn't listed as a trigger in the reference table but is a valid analyst capability described elsewhere in the BMAD docs.

---

### Q5: Does computeNextStep logic correctly follow BMAD's phase progression?
**FAIL — IMPORTANT**

The `computeNextStep()` function (api-client.ts:306-374) assigns architecture creation to `phase: "planning"` (line 337), but per the BMAD methodology:

- **Phase 2 (Planning):** PRD creation
- **Phase 3 (Solutioning):** Architecture, UX design, epics/stories

The BMAD docs explicitly state: "Phase 3 (Solutioning) translates **what** to build (from Planning) into **how** to build it (technical design)." Architecture is Phase 3, not Phase 2.

**Fix:** Change api-client.ts:337 from `phase: "planning"` to `phase: "solutioning"`.

The rest of the progression is correct:
- No product-brief → analysis ✓
- No PRD → planning ✓
- No architecture → **should be solutioning** ✗
- No UX spec → solutioning ✓
- No epics → solutioning ✓
- No stories → solutioning ✓
- Default → implementation ✓

---

### Q6: Is tool naming consistent with existing tools?
**PASS**

All BMAD tools use `snake_case` with a `bmad_` prefix:
- `bmad_status` — matches `project_status`, `workflow_status` pattern
- `bmad_next_step` — descriptive, consistent
- `bmad_run_skill` — matches `start_execution`, `start_workflow` action-verb pattern

---

### Q7: Does the handleApiTool switch correctly route to the right API client methods?
**PASS**

In `server.ts:370-375`, all 3 BMAD tools are correctly routed:
- `bmad_status` → `this.apiClient.getBmadStatus()` ✓
- `bmad_next_step` → `this.apiClient.getBmadNextStep()` ✓
- `bmad_run_skill` → `this.apiClient.runBmadSkill(args)` ✓

The routing pattern matches exactly how other scopes are handled (direct method delegation with `args as any` cast).

---

### Q8: Are the MCP tool descriptions accurate and helpful for AI agents?
**PASS**

- `bmad_status`: "Get BMAD Method status: current phase, artifact completion, and progress." — Accurately describes what the endpoint returns.
- `bmad_next_step`: "Get the next recommended BMAD workflow step based on current artifact state." — Clear guidance for agents to understand workflow progression.
- `bmad_run_skill`: "Start a BMAD workflow execution with the appropriate persona." — Tells agents this creates an execution.

The descriptions follow the existing pattern of leading with what the tool does and when to use it.

---

### Q9: Does getPersonaConfig return valid Partial<ClaudeCodeConfig> per agents.d.ts?
**PASS**

`getPersonaConfig()` (persona-prompts.ts:295-299) returns:
```typescript
{ appendSystemPrompt: string }
```

This is valid `Partial<ClaudeCodeConfig>` — the `appendSystemPrompt` field is defined in `ClaudeCodeConfig` at agents.d.ts:110 as `string | undefined`. The return type correctly appends to the default system prompt rather than replacing it, which is the right approach for persona injection.

---

### Q10: Are there any BMAD skills/workflows we should expose as MCP tools but don't?
**FAIL — IMPORTANT**

The server has 6 additional BMAD endpoints not exposed as MCP tools:

| Server Endpoint | Purpose | Should Expose? |
|----------------|---------|----------------|
| `GET /api/bmad/agents` | List BMAD personas | MINOR — useful for discovery |
| `GET /api/bmad/artifacts` | Scan artifact files | YES — needed for agents to inspect state |
| `POST /api/bmad/import` | Trigger BMAD sync | MINOR — operational |
| `POST /api/bmad/workflow` | Generate BMAD workflow template | YES — key orchestration capability |
| `POST /api/bmad/gate` | Apply quality gate results | YES — quality gates are core BMAD |
| `POST /api/bmad/gate/resolve` | Resolve quality gates | YES — completes the gate lifecycle |

**Recommended additions (priority order):**

1. **`bmad_gate`** — Quality gates are a Phase 3 BMAD feature (readiness checks, story validation, code review). Without this, agents can't enforce BMAD quality standards.
2. **`bmad_artifacts`** — Agents need to see what artifacts exist to make informed decisions. Currently `bmad_next_step` computes this internally but doesn't expose raw artifact data.
3. **`bmad_workflow`** — Generating BMAD workflow templates is a key orchestration capability for multi-step BMAD projects.

---

## Summary of Findings

### CRITICAL

| # | Finding | File | Fix |
|---|---------|------|-----|
| C1 | `runBmadSkill` bypasses `/api/bmad/execute`, persona prompt injection never happens | `mcp/src/api-client.ts:778-793` | Route to `POST /api/bmad/execute` instead of generic execution endpoints |

### IMPORTANT

| # | Finding | File | Fix |
|---|---------|------|-----|
| I1 | `computeNextStep` assigns architecture to "planning" instead of "solutioning" | `mcp/src/api-client.ts:337` | Change `phase: "planning"` to `phase: "solutioning"` |
| I2 | Dev persona name "Amos" in server route vs "Amelia" in plugin and BMAD spec | `server/src/routes/bmad.ts:102` | Change `"Amos"` to `"Amelia"` |
| I3 | Quality gate MCP tools missing — agents can't enforce BMAD quality standards | `mcp/src/tool-registry.ts` | Add `bmad_gate` and `bmad_gate_resolve` tools |
| I4 | `bmad_run_skill` has optional `issue_id` but `POST /api/bmad/execute` requires `issueId` | `mcp/src/tool-registry.ts:799` | Either make `issue_id` required or update server to support adhoc |

### MINOR

| # | Finding | File | Fix |
|---|---------|------|-----|
| M1 | `computeNextStep` logic duplicated between MCP client and server `detectPhase` | `mcp/src/api-client.ts` | Consider adding a server endpoint for next-step computation |
| M2 | `bmad_artifacts` tool not exposed — agents can't inspect raw artifact state | `mcp/src/tool-registry.ts` | Add `bmad_artifacts` tool |
| M3 | Server BMAD_AGENTS array duplicates data from plugin BMAD_PERSONAS | `server/src/routes/bmad.ts:44-144` | Consider importing from the plugin instead of duplicating |

---

## Cross-Cutting Issues

- **C1 affects the server/execution review (Task #3):** The `createBmadExecution` service in the server is correctly wired but never called from MCP because the API client uses the wrong endpoint.
- **I2 is a data inconsistency between server routes and plugin code:** The server route's `BMAD_AGENTS` array (Task #3) has "Amos" while the plugin's `BMAD_PERSONAS` (Task #1) has "Amelia". Both should match the BMAD spec ("Amelia").
