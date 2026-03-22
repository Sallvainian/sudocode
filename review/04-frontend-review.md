# Frontend Review — BMAD Integration (Phase 2)

**Reviewer:** frontend-reviewer
**Date:** 2026-03-22
**Scope:** 18 components, 3 pages, 2 hooks, 1 types file, route/sidebar integration

---

## Review Questions

### 1. Do components use the same UI primitives as the rest of the app?

**PASS** — Components consistently use:
- **Radix UI:** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (BmadGateChecklist)
- **shadcn/ui:** `Badge`, `Button`, `ScrollArea`, `Separator`, `Card` (via KanbanCard)
- **Tailwind:** All styling via `cn()` utility + Tailwind classes throughout
- **lucide-react icons:** `CheckCircle2`, `Circle`, `Loader2`, `Shield*`, `ChevronRight`, `ArrowRight`, `Lightbulb`, `Filter`, `X`, `Play`, `LayoutList`, `Rocket`, `ExternalLink`, etc.
- **react-resizable-panels:** `PanelGroup`/`Panel`/`PanelResizeHandle` in BmadSprintPage (matches existing pattern)

### 2. Do hooks follow the React Query + WebSocket invalidation pattern?

**FAIL — No WebSocket invalidation.** The existing `useWorkflows` hook registers WebSocket message handlers and invalidates queries on real-time events. The BMAD hooks (`useBmadPipeline`, `useBmadPersonas`) use React Query correctly but **do not subscribe to any WebSocket channel** for real-time updates. If a BMAD artifact is created or a phase changes while the page is open, the UI won't update until the `staleTime` (30s) expires and a refetch triggers.

Additionally, the BMAD hooks **create their own axios instance** instead of importing the shared `api` instance from `@/lib/api.ts`. Every other hook in the codebase uses the centralized API client.

### 3. Are routes correctly nested under `/p/:projectId/` with ProtectedRoute wrapper?

**PASS** — All three BMAD routes are nested inside the `<Route path="p/:projectId">` block in `App.tsx`:
- `bmad` → `<BmadDashboardPage />`
- `bmad/pipeline` → `<BmadPipelinePage />`
- `bmad/sprint` → `<BmadSprintPage />`

All wrapped in `<ProtectedRoute>`.

### 4. Does the sidebar entry match the existing navItems format?

**PASS** — The BMAD entry in `Sidebar.tsx` follows the exact `{ path, basePath, label, icon }` format:
```ts
{ path: paths.bmad(), basePath: '/bmad', label: 'BMAD', icon: Rocket }
```
Consistent with other entries (Issues, Specs, Workflows, etc.).

### 5. Does BmadPipelineDAG properly use React Flow + dagre like WorkflowDAG?

**PASS** — BmadPipelineDAG closely mirrors WorkflowDAG:
- Same imports: `ReactFlow`, `Background`, `Controls`, `MiniMap`, `useNodesState`, `useEdgesState`, `dagre`
- Same dagre layout pattern (`graphlib.Graph`, `setGraph`, `setNode`, `setEdge`, `dagre.layout`)
- Same `useEffect` sync when steps change
- Same `nodeTypes` registration for custom nodes
- Same `fitView`, `proOptions: { hideAttribution: true }`, `colorMode={actualTheme}` pattern
- **Improvement:** BmadPipelineDAG supports variable node dimensions per type (phase-group/workflow/gate) vs. WorkflowDAG's fixed dimensions

### 6. Does BmadSprintBoard correctly reuse KanbanProvider/Board/Card infrastructure?

**PASS** — BmadSprintBoard directly imports and uses:
- `KanbanProvider` with `onDragEnd` and `renderDragOverlay`
- `KanbanBoard` with `id` and `collapsed` props
- `KanbanHeader` with `name`, `color`, `count`, `collapsed`, `onToggleCollapse`
- `KanbanCards` with `collapsed`

Pattern matches `IssueKanbanBoard.tsx` closely. `BmadStoryCard` wraps `KanbanCard` correctly with `id`, `name`, `index`, `parent`, `isOpen`, `onClick` props.

### 7. Are status colors/styles consistent with STEP_STATUS_STYLES patterns?

**PASS** — `BMAD_PHASE_STATUS_STYLES` and `BMAD_GATE_STYLES` in `types/bmad.ts` follow the same `{ border, background, text }` structure as `STEP_STATUS_STYLES` in `types/workflow.ts`. Color choices are consistent:
- Green for completed/pass (`border-green-500`, `bg-green-500/10`)
- Blue for active/running (`border-blue-500`, `bg-blue-500/10`)
- Red for fail (`border-red-500`)
- Yellow for concerns
- Muted for upcoming/pending

BMAD adds an `icon` field to the style objects (not in STEP_STATUS_STYLES) — a minor inconsistency but not problematic.

### 8. Do page layouts follow the existing page structure?

**PASS** — All three pages follow the established pattern:
- **Header:** `border-b p-4` with title + badge
- **Content area:** `flex h-full flex-col` with `flex-1 overflow-hidden`
- **BmadDashboardPage:** header → phase tracker → sidebar + main content (matches WorkflowDetailPage layout)
- **BmadPipelinePage:** header → full-height DAG (matches WorkflowDetailPage DAG view)
- **BmadSprintPage:** header → filter bar → PanelGroup with resizable detail panel (matches IssuesPage pattern)

### 9. Is types/bmad.ts consistent with what the server API returns?

**PASS with caveat** — The types file claims to mirror `server/src/routes/bmad.ts`. The response shapes (`BmadStatusResponse`, `BmadArtifactsResponse`, `BmadAgentsResponse`) are reasonable and the hooks handle `response.data?.data ?? response.data` for flexibility. However, I cannot fully verify server-side consistency without the server reviewer confirming the exact response shapes from `server/src/routes/bmad.ts`. **Cross-cutting concern for server reviewer.**

### 10. Are there missing imports, broken references, or components that don't exist?

**FAIL — Missing barrel exports.** The `index.ts` barrel file does NOT export:
- `BmadSprintBoard`
- `BmadStoryCard`
- `BmadStoryDetailPanel`
- `BmadEpicFilter`

These 4 components are imported directly by path in `BmadSprintPage.tsx` (which works), but they are absent from the barrel index. This is inconsistent — either all components should be in the barrel, or none should be. The sprint-related components are arguably the most important ones.

All other imports resolve correctly. `getColorFromId` from `@/utils/colors` exists and is used by other components (IssueCard, WorkflowIndicator).

### 11. Do components handle loading/error states like existing components?

**PASS** — All three pages handle loading, error, and empty states:
- **Loading:** Spinner with `Loader2` animation (BmadDashboardPage, BmadPipelinePage) or text placeholder (BmadSprintPage)
- **Error:** `text-destructive` error message with error detail
- **Empty/not installed:** BmadDashboardPage shows "BMAD Not Installed" guidance
- **Empty DAG:** BmadPipelineDAG shows "No pipeline steps configured"

Minor inconsistency: BmadSprintPage uses a text "Loading sprint board..." instead of a spinner icon like the other two pages.

### 12. Are useProjectRoutes additions consistent with existing path helpers?

**PASS** — Three BMAD paths added to `useProjectRoutes.ts`:
```ts
bmad: () => buildPath('/bmad'),
bmadPipeline: () => buildPath('/bmad/pipeline'),
bmadSprint: () => buildPath('/bmad/sprint'),
```
Matching `go` navigation functions also added. All follow the exact same pattern as existing entries (issues, specs, workflows, etc.).

---

## Findings

### CRITICAL

**C1: BMAD hooks create duplicate axios instances instead of using shared API client**
- **Files:** `useBmadPipeline.ts:21`, `useBmadPersonas.ts:14`
- **Issue:** Both hooks create `axios.create({ baseURL: ... })` locally instead of importing `api` from `@/lib/api.ts`. The shared client likely includes interceptors for auth, project headers, error handling, and request/response transforms. The BMAD hooks manually add `X-Project-ID` headers, which the shared client may handle automatically.
- **Impact:** Missing auth interceptors, inconsistent error handling, potential double project ID headers if the shared client already sets them.
- **Fix:** Import and use the shared `api` instance from `@/lib/api.ts`, or at minimum use the same request interceptors.

**C2: No WebSocket integration for real-time updates**
- **Files:** `useBmadPipeline.ts`, `useBmadPersonas.ts`
- **Issue:** Unlike `useWorkflows` which subscribes to WebSocket channels and invalidates queries on events, the BMAD hooks rely solely on `staleTime` for freshness. When a BMAD artifact is created (e.g., via CLI or MCP tool), the dashboard won't reflect it until the stale timer expires.
- **Impact:** Stale UI when BMAD operations happen outside the browser. Particularly problematic since BMAD artifacts are typically created by agent personas running in terminals.
- **Fix:** Add WebSocket message handler that invalidates `bmadKeys.all` on relevant events (requires server to emit BMAD-specific WebSocket events).

### IMPORTANT

**I1: Sprint-related components missing from barrel index**
- **File:** `components/bmad/index.ts`
- **Issue:** 4 components not exported: `BmadSprintBoard`, `BmadStoryCard`, `BmadStoryDetailPanel`, `BmadEpicFilter`. These are imported by path in `BmadSprintPage.tsx` which works, but it's inconsistent with the barrel pattern used for the other 13 components.
- **Fix:** Add exports for the missing components to `index.ts`.

**I2: `executionsApi.listAll` typing is `any` in BmadSprintPage**
- **File:** `BmadSprintPage.tsx:141`
- **Issue:** `const byIssueId: Record<string, any> = {}` — execution objects are typed as `any` instead of using the `Execution` type that's already imported.
- **Fix:** Type as `Record<string, Execution>`.

**I3: BmadNextStepPanel button has no click handler**
- **File:** `BmadNextStepPanel.tsx:160`
- **Issue:** The "Run {recommendation.title}" button renders but has no `onClick` handler. It's purely decorative — clicking it does nothing. There's no `onRunSkill` or similar callback in the props.
- **Fix:** Either add an `onRunSkill` prop and wire it up in BmadDashboardPage, or mark the button as disabled with a tooltip explaining it's coming soon.

### MINOR

**M1: Inconsistent loading state in BmadSprintPage**
- **File:** `BmadSprintPage.tsx:300-305`
- **Issue:** Uses text "Loading sprint board..." while the other two BMAD pages use `<Loader2 className="h-6 w-6 animate-spin" />` spinner. Should match for visual consistency.

**M2: BmadPersonaDetail uses raw `<button>` instead of shadcn Button**
- **File:** `BmadPersonaDetail.tsx:92-98`
- **Issue:** The "Run as {persona}" button is a raw `<button>` with manual Tailwind classes instead of using the `<Button>` component from shadcn/ui like everywhere else.
- **Fix:** Replace with `<Button className="w-full">`.

**M3: `BmadPhaseGroupNode` has unused collapsed state**
- **File:** `BmadPhaseGroupNode.tsx:56`
- **Issue:** The component has internal `collapsed` state with a toggle button, but since dagre controls layout, collapsing a phase group node doesn't actually hide its child workflow nodes in the DAG. The collapsed state only hides the description/progress within the node itself, which could be confusing.

**M4: BmadSprintPage uses `h-screen` instead of `h-full`**
- **File:** `BmadSprintPage.tsx:318`
- **Issue:** Uses `h-screen` while other pages use `h-full`. Since pages render inside a layout container, `h-screen` may cause overflow issues with the sidebar/header.
- **Fix:** Change to `h-full` to match other pages.

**M5: Default export inconsistency**
- Some components have both named + default exports (`BmadStoryCard`, `BmadStoryCycleRing`, `BmadEpicFilter`, `BmadStoryDetailPanel`, `BmadSprintBoard`), while others only have named exports. The rest of the codebase generally uses named exports with barrel re-exports.

---

## Summary

| Category | Count |
|----------|-------|
| CRITICAL | 2 |
| IMPORTANT | 3 |
| MINOR | 5 |
| PASS | 10/12 questions |

The frontend BMAD integration is **well-structured and follows existing patterns closely**. The DAG visualization, kanban board, and page layouts are all faithful to established conventions. The two critical issues (duplicate axios instances and missing WebSocket integration) are architectural concerns that affect reliability and consistency rather than correctness — the code will work but won't benefit from shared infrastructure the rest of the app relies on.
