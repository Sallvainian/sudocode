# Parser & Sync Review — BMAD Integration Plugin

**Reviewer:** parser-sync-reviewer
**Date:** 2026-03-22
**Files Reviewed:**
- `plugins/integration-bmad/src/parser/artifact-parser.ts`
- `plugins/integration-bmad/src/parser/prd-parser.ts`
- `plugins/integration-bmad/src/parser/architecture-parser.ts`
- `plugins/integration-bmad/src/parser/epic-parser.ts`
- `plugins/integration-bmad/src/parser/story-parser.ts`
- `plugins/integration-bmad/src/parser/sprint-parser.ts`
- `plugins/integration-bmad/src/parser/markdown-utils.ts`
- `plugins/integration-bmad/src/watcher.ts`
- `plugins/integration-bmad/src/writer/sprint-writer.ts`
- `plugins/integration-bmad/src/writer/story-writer.ts`
- `plugins/integration-bmad/src/writer/index.ts`

**Reference Files:**
- `plugins/integration-openspec/src/index.ts` (watcher pattern)
- `plugins/integration-beads/src/index.ts` (watcher pattern)
- `types/src/integrations.d.ts` (ExternalChange interface)
- `cli/src/integrations/sync-coordinator.ts` (sync engine)
- `bmad-llms-full.txt` (BMAD format reference)

---

## Review Questions

### Q1: Do parsers handle ALL BMAD artifact formats documented in bmad-llms-full.txt?

**PASS (with minor gaps)**

The parsers cover the core BMAD artifacts:
- PRD (`prd-parser.ts`) — ✅
- Architecture (`architecture-parser.ts`) — ✅
- UX Spec / UX Design (`artifact-parser.ts` via `FILENAME_TYPE_MAP`) — ✅
- Product Brief (`artifact-parser.ts`) — ✅
- Project Context (`artifact-parser.ts`) — ✅

The generic `artifact-parser.ts` with `detectArtifactType()` handles auto-detection via filename patterns, which is good.

**Note:** `prd-parser.ts` and `architecture-parser.ts` are functionally identical to calling `parseArtifact(filePath, "prd")` and `parseArtifact(filePath, "architecture")`. They are redundant but harmless — could be simplified to just use `artifact-parser.ts` for all planning artifacts. This is a **MINOR** style issue, not a bug.

### Q2: Does epic parser handle BOTH sharded (`epics/epic-N.md`) AND combined (`epics.md`) formats?

**PASS**

`epic-parser.ts` correctly implements:
- `parseEpicFile()` — single sharded file (e.g., `epic-1.md`)
- `parseCombinedEpicsFile()` — combined `epics.md` with multiple epics
- `scanAndParseEpics()` — auto-detects directory vs file, scans for `epic-*.md` pattern, falls back to combined `epics.md` if no sharded files found

The BMAD docs confirm both formats: `epics.md` or `epics/epic*.md` in `_bmad-output/planning-artifacts/`. The parser correctly handles the "dual discovery system" described in the docs (whole document vs sharded version).

**Minor concern:** Line 191 — `parseCombinedEpicsFile` is only called if `epics.length === 0`, meaning if any sharded epic files exist, a combined `epics.md` in the same directory is ignored. This is correct behavior per the BMAD priority rule ("Whole document takes precedence if both exist — remove the whole document if you want the sharded to be used instead"), though the priority is inverted here (sharded takes precedence). This matches the intent since the directory was explicitly entered.

### Q3: Is sprint-status.yaml parsing correct per the BMAD format?

**PASS**

`sprint-parser.ts` correctly handles:
- `epic-N` keys via `EPIC_KEY_RE = /^epic-(\d+)$/` — ✅
- `N-M-slug` story keys via `STORY_KEY_RE = /^(\d+)-(\d+)-(.+)$/` — ✅
- `epic-N-retrospective` keys via `RETRO_KEY_RE = /^epic-(\d+)-retrospective$/` — ✅
- Status values: `backlog`, `in-progress`, `ready-for-dev`, `review`, `done` — ✅
- Legacy status aliases: `contexted` → `in-progress`, `completed` → `done`, `ready` → `ready-for-dev`, `in-review` → `review` — ✅

The two-pass approach (first identify epics, then assign stories/retrospectives) is clean and handles out-of-order YAML entries correctly.

**Minor note:** Top-level YAML fields (`generated`, `last_updated`, `project`, `story_location`) are parsed but not exposed in the `ParsedSprintStatus` interface. These could be useful for display purposes but aren't strictly needed for sync.

### Q4: Does the watcher anti-oscillation pattern match existing plugins?

**PASS (with differences)**

The `BmadWatcher` follows the same core pattern as `OpenSpecWatcher` and `BeadsWatcher`:
- ✅ Content hashing via SHA-256 to detect actual changes
- ✅ Hash comparison before emitting changes (`oldHash === newHash` → skip)
- ✅ `updateFileHash(filePath)` method for post-write hash updates
- ✅ Debounced batch notifications (150ms default, vs 100ms for OpenSpec)
- ✅ `chokidar` with `awaitWriteFinish` for atomic write handling
- ✅ `ignoreInitial: true` to skip startup events

**Differences from OpenSpec watcher (acceptable):**
- BMAD watcher hashes **file content** directly, while OpenSpec hashes **entity objects**. Both approaches work; BMAD's is simpler and appropriate since BMAD artifacts are individual files.
- BMAD watcher uses `pendingChangedFiles: Set<string>` (file-path based), while OpenSpec tracks entity IDs. This is correct given the file-per-artifact nature of BMAD.

**IMPORTANT finding:** The `updateFileHash()` method takes a `filePath` parameter, which is good for the writer to call after writing. However, I don't see the provider calling `watcher.updateFileHash()` after writer operations. This needs to be verified in the provider/index.ts — if the provider doesn't call it after `updateStoryStatus()`, `updateEpicStatus()`, `updateStoryFileStatus()`, etc., there will be oscillation loops.

### Q5: Does bidirectional write-back preserve BMAD file formatting?

**FAIL — IMPORTANT**

**Sprint writer (`sprint-writer.ts`):**
- Uses `yaml.dump()` with `lineWidth: -1` and `noRefs: true` — this will **reformat the YAML** on every write. Comments will be lost, key ordering may change, and quoted strings may be altered.
- The BMAD format uses a specific timestamp format (`MM-DD-YYYY HH:mm`) which the writer correctly replicates via `formatTimestamp()`.
- However, `yaml.dump()` with `forceQuotes: false` may change quoting around values like `story_location: "{story_location}"` which has intentional quotes in the original.

**Story writer (`story-writer.ts`):**
- Status line replacement via regex is clean and preserves surrounding content — ✅
- `updateAllTasksCompletion()` uses simple regex replacement (`- [x]` / `- [ ]`) which preserves formatting — ✅

**Recommendation:** For `sprint-writer.ts`, consider using a line-level YAML editor (like `yaml` package's `parseDocument()` with CST preservation) or manual string manipulation to preserve comments and formatting. The current approach using `yaml.load()` → modify → `yaml.dump()` is a **lossy roundtrip**.

### Q6: Are story file paths correct?

**PASS**

Story files are at `_bmad-output/implementation-artifacts/story-*.md` per the BMAD docs. The `story-parser.ts` file:
- `STORY_FILENAME_RE = /^story[- ](\d+)[- ](\d+)[- ](.+)\.md$/i` — matches `story-1-2-user-auth.md` ✅
- `scanAndParseStories()` filters by `entry.name.match(/^story[- ]/i)` and `.endsWith(".md")` — ✅

The BMAD docs confirm: `bmad-create-story` produces `story-[slug].md` in implementation-artifacts.

### Q7: Are planning artifact paths correct?

**PASS**

Per the BMAD docs, the directory structure is:
```
_bmad-output/
├── planning-artifacts/
│   ├── PRD.md
│   ├── architecture.md
│   └── epics/
├── implementation-artifacts/
│   └── sprint-status.yaml
└── project-context.md
```

The `artifact-parser.ts` `FILENAME_TYPE_MAP` includes `prd`, `architecture`, `ux-spec`, `ux-design`, `product-brief`, `project-context` — all correct.

The watcher watches `planning-artifacts/**/*.md` which covers all of these. The `project-context.md` at the root of `_bmad-output/` is also watched separately — ✅.

### Q8: Does the watcher watch the right directories/globs?

**PASS**

Watcher paths (lines 81-86):
```typescript
path.join(bmadOutputPath, "planning-artifacts", "**", "*.md")     // PRD, architecture, epics
path.join(bmadOutputPath, "implementation-artifacts", "**", "*.md") // story files
path.join(bmadOutputPath, "implementation-artifacts", "sprint-status.yaml") // sprint status
path.join(bmadOutputPath, "project-context.md")                    // project context
```

This covers:
- ✅ `planning-artifacts/PRD.md`
- ✅ `planning-artifacts/architecture.md`
- ✅ `planning-artifacts/epics/epic-*.md`
- ✅ `implementation-artifacts/story-*.md`
- ✅ `implementation-artifacts/sprint-status.yaml`
- ✅ `project-context.md`

The `**` glob recursion handles the `epics/` subdirectory correctly.

### Q9: Do ExternalChange objects from the watcher match the interface?

**PASS (with minor concern)**

The `ExternalChange` interface from `types/src/integrations.d.ts`:
```typescript
interface ExternalChange {
  entity_id: string;
  entity_type: "spec" | "issue";
  change_type: "created" | "updated" | "deleted";
  timestamp: string;
  data?: ExternalEntity;
}
```

The BMAD watcher emits (lines 247-253):
```typescript
changes.push({
  entity_id: filePath,        // Uses file path as entity_id
  entity_type: entityType,    // "spec" or "issue" from classifyFile()
  change_type: exists ? "updated" : "deleted",
  timestamp: now,
});
```

**Concern:** The `entity_id` is set to `filePath` with a comment "Provider will resolve to actual entity ID." This means the provider's `handleInboundChanges` or equivalent must map file paths to actual entity IDs before passing to the sync coordinator. This is a valid pattern (OpenSpec does something similar with its entity-level hashing), but it requires the provider to correctly resolve paths.

**Missing:** The `data` field is not populated in the watcher's ExternalChange. This means the sync coordinator won't have entity data for `created` changes and would need to call `fetchEntity()` separately. The OpenSpec watcher populates `data` for created/updated changes. This could cause issues if the sync coordinator relies on `data` being present for auto-import (see `processInboundChange` in `sync-coordinator.ts` line 495: `if (autoImport && change.data)`).

**Also missing:** The watcher never emits `change_type: "created"` — new files get `"updated"` because `existsSync` returns true for newly created files. This means auto-import of new BMAD artifacts won't trigger unless the provider compensates. The sync coordinator treats `created` and `updated` differently for new entities (lines 491-557).

### Q10: Is there any BMAD artifact format we're NOT parsing that we should be?

**MINOR — Two potential gaps:**

1. **UX Design artifacts** — The BMAD docs mention `bmad-create-ux-design` producing UX design specs. The `artifact-parser.ts` maps `ux-design` → `ux-spec` and `ux-spec` → `ux-spec`, so these are handled. ✅

2. **Tech-spec (Quick Flow)** — The BMAD docs mention Quick Flow track produces a "tech-spec" instead of PRD. There's no explicit `tech-spec` mapping in `FILENAME_TYPE_MAP`. However, the partial match logic in `detectArtifactType()` would catch a filename containing "prd" but not "tech-spec". If Quick Flow users create a `tech-spec.md` file, it won't be auto-detected.

3. **Retrospective artifacts** — The `sprint-parser.ts` handles `epic-N-retrospective` keys in the YAML, but retrospective documents themselves (if they produce markdown files) aren't explicitly parsed. This is likely fine since retrospectives are primarily status tracking.

---

## Findings Summary

### CRITICAL

*None found.*

### IMPORTANT

1. **Sprint writer destroys YAML formatting** (`sprint-writer.ts:127-135`) — `yaml.load()` → modify → `yaml.dump()` is a lossy roundtrip that strips comments, changes key ordering, and may alter quoting. This will cause noisy diffs and may break BMAD tools that depend on specific formatting.
   - **Fix:** Use CST-preserving YAML editing (e.g., `yaml` package's `parseDocument()` with direct node manipulation) or line-level string manipulation.

2. **Watcher never emits `change_type: "created"`** (`watcher.ts:247`) — New files always get `"updated"` because `existsSync()` returns true. The sync coordinator in `processInboundChange()` only auto-imports entities when `change_type === "created"` AND `!linkedEntity`. This means new BMAD artifacts won't be auto-imported.
   - **Fix:** Track whether a file path was previously known. If `oldHash` is undefined and the file exists, emit `"created"` instead of `"updated"`.

3. **Watcher doesn't populate `data` field in ExternalChange** (`watcher.ts:247-253`) — The `data` field is undefined. The sync coordinator checks `change.data` for auto-import (line 495) and for applying updates (line 661). Without `data`, the coordinator would need to call `fetchEntity()`, but for `created` changes that have no linked entity yet, it won't have the data to create one.
   - **Fix:** Either populate `data` with the parsed ExternalEntity in the watcher, or ensure the provider resolves entity data before forwarding changes to the coordinator.

### MINOR

4. **Redundant parsers** — `prd-parser.ts` and `architecture-parser.ts` are functionally identical to `parseArtifact(filePath, "prd")` and `parseArtifact(filePath, "architecture")`. Consider removing them and using `artifact-parser.ts` exclusively.

5. **`tech-spec` not in filename type map** (`artifact-parser.ts:22-30`) — Quick Flow track produces tech-spec files that won't be auto-detected by `detectArtifactType()`.
   - **Fix:** Add `"tech-spec": "prd"` to `FILENAME_TYPE_MAP`.

6. **Sprint parser discards top-level YAML metadata** (`sprint-parser.ts:76-87`) — Fields like `generated`, `last_updated`, `project`, `story_location` are parsed but not exposed. The `story_location` field in particular tells where story files are stored and could be useful for the watcher.

7. **`extractSections()` doesn't support nested heading scoping** (`markdown-utils.ts:83-119`) — All headings create flat sections rather than a nested tree. A `## Subsection` after `# Section` creates a sibling, not a child. This works for BMAD's simple structure but may miss content organization nuance.

8. **Anti-oscillation gap** — The watcher's `updateFileHash()` is not called from the writer module. The writer index (`writer/index.ts`) re-exports writer functions but doesn't integrate with the watcher. The provider must call `watcher.updateFileHash()` after each write, but this coupling isn't enforced or documented.

---

## Cross-Cutting Concerns

- **Finding #2 and #3 (watcher → sync coordinator contract):** These are likely to affect all BMAD artifacts during initial import. The plugin-core reviewer should verify the provider correctly bridges between the watcher's file-path-based changes and the sync coordinator's entity-based expectations.

- **Finding #1 (YAML formatting):** The sprint-status.yaml is the primary interface between BMAD workflows and the sudocode integration. Formatting loss here could break the BMAD scrum master workflows that depend on the file structure.
