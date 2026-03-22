# Plugin Core Review — BMAD Integration

**Reviewer:** plugin-core-reviewer
**Date:** 2026-03-22
**Files Reviewed:**
- `plugins/integration-bmad/src/plugin.ts`
- `plugins/integration-bmad/src/types.ts`
- `plugins/integration-bmad/src/entity-mapper.ts`
- `plugins/integration-bmad/src/id-generator.ts`
- `plugins/integration-bmad/src/relationship-mapper.ts`
- `plugins/integration-bmad/src/index.ts`

**Reference Files:**
- `types/src/integrations.d.ts` — Canonical interface definitions
- `types/src/index.d.ts` — Core entity types
- `cli/src/integrations/types.ts` — Local provider interface (used by sync-coordinator)
- `cli/src/integrations/sync-coordinator.ts` — Runtime consumer of providers
- `cli/src/operations/external-links.ts` — Entity creation from external sources
- `plugins/integration-openspec/src/index.ts` — Reference plugin (file-based, multi-entity)
- `plugins/integration-beads/src/index.ts` — Reference plugin (simplest)
- `plugins/integration-speckit/src/relationship-mapper.ts` — Relationship pattern reference

---

## Review Questions

### Q1: Does BmadPlugin implement ALL required fields of IntegrationPlugin?

**PASS**

| Field | Required | Present | Notes |
|-------|----------|---------|-------|
| `name` | Yes | ✓ `"bmad"` | |
| `displayName` | Yes | ✓ `"BMAD Method"` | |
| `version` | Yes | ✓ `"0.1.0"` | |
| `description` | No | ✓ | |
| `configSchema` | No | ✓ | |
| `validateConfig()` | Yes | ✓ | Correct signature `(options: Record<string, unknown>): PluginValidationResult` |
| `testConnection()` | Yes | ✓ | Correct signature `(options, projectPath): Promise<PluginTestResult>` |
| `createProvider()` | Yes | ✓ | Correct signature, returns `IntegrationProvider` |

### Q2: Does BmadProvider implement ALL required methods of IntegrationProvider with correct signatures?

**FAIL — Missing `validate()` method**

| Method | Required | Present | Signature Match | Notes |
|--------|----------|---------|-----------------|-------|
| `initialize()` | Yes | ✓ | ⚠️ | See note 1 |
| `dispose()` | Yes | ✓ | ✓ | |
| `fetchEntity()` | Yes | ✓ | ✓ | |
| `searchEntities()` | Yes | ✓ | ⚠️ | See note 2 |
| `createEntity()` | Yes | ✓ | ✓ | Throws (acceptable) |
| `updateEntity()` | Yes | ✓ | ✓ | |
| `getChangesSince()` | Yes | ✓ | ✓ | |
| `mapToSudocode()` | Yes | ✓ | ⚠️ | See note 3 |
| `mapFromSudocode()` | Yes | ✓ | ✓ | |
| `validate()` | Yes* | ❌ | N/A | **CRITICAL** — see below |
| `startWatching()` | No | ✓ | ✓ | |
| `stopWatching()` | No | ✓ | ✓ | |
| `deleteEntity()` | No | ✗ | N/A | Optional, fine |

**Note 1:** `initialize()` — The canonical `@sudocode-ai/types` interface declares `initialize(): Promise<void>` (no args). The local `cli/src/integrations/types.ts` declares `initialize(config: IntegrationConfig): Promise<void>`. BmadProvider matches the canonical interface. The sync-coordinator passes config but JS silently ignores extra arguments — **no runtime error**, but worth noting.

**Note 2:** `searchEntities()` — BmadProvider declares `async searchEntities(): Promise<ExternalEntity[]>` with **no parameters**. The canonical interface expects `(query?: string, options?: SearchOptions)`. Since params are optional, TypeScript compiles fine, but the query parameter is silently ignored. Acceptable since `supportsSearch = false`.

**Note 3:** `mapToSudocode()` return type is `{ spec?, issue?, relationships? }`, but the canonical interface specifies `{ spec?, issue? }`. The extra `relationships` field is harmless (TypeScript structural typing allows it) but isn't consumed by the sync-coordinator, which reads relationships from `ExternalEntity.relationships` instead.

### Q3: Does BmadProvider set ALL required readonly properties?

**PASS**

| Property | Present | Value |
|----------|---------|-------|
| `name` | ✓ | `"bmad"` |
| `supportsWatch` | ✓ | `true` |
| `supportsPolling` | ✓ | `true` |
| `supportsOnDemandImport` | ✓ | `false` |
| `supportsSearch` | ✓ | `false` |
| `supportsPush` | ✓ | `true` |

### Q4: Does searchEntities return type match `ExternalEntity[] | SearchResult`?

**PASS** — Returns `ExternalEntity[]`, which is a valid member of the union type `ExternalEntity[] | SearchResult`.

### Q5: Does mapToSudocode return `{ spec?: Partial<Spec>; issue?: Partial<Issue> }` exactly?

**PASS (with caveat)** — Returns a superset with an extra `relationships` property. TypeScript structural typing accepts this. The OpenSpec plugin does the same thing. The extra field is not consumed by the sync-coordinator.

### Q6: Does mapFromSudocode accept `Spec | Issue` and return `Partial<ExternalEntity>`?

**PASS** — Signature matches exactly. Implementation correctly handles both Spec and Issue via `"status" in entity` check, consistent with Beads and OpenSpec patterns.

### Q7: Are ALL ExternalEntity objects valid? (required: id, type, title)

**PASS** — All four entity creation paths produce valid ExternalEntities:

| Source | id | type | title |
|--------|----|------|-------|
| `artifactToExternalEntity` | ✓ `bm-prd` etc. | ✓ `"spec"` | ✓ from artifact |
| `epicToExternalEntity` | ✓ `bme-N` | ✓ `"issue"` | ✓ from epic |
| `storyToExternalEntity` | ✓ `bms-N-M` | ✓ `"issue"` | ✓ from story |
| Inline stories (plugin.ts:288) | ✓ `bms-N-M` | ✓ `"issue"` | ✓ from inline story |

### Q8: Are ALL ExternalRelationship objects valid? (targetId, targetType, relationshipType — only 6 valid types)

**PASS** — All relationships use valid types:

| Location | relationshipType | Valid? |
|----------|-----------------|--------|
| `epicToExternalEntity` → PRD | `"implements"` | ✓ |
| `storyToExternalEntity` → Epic | `"implements"` | ✓ |
| Inline stories → Epic | `"implements"` | ✓ |
| `relationship-mapper`: arch→PRD | `"references"` | ✓ |
| `relationship-mapper`: ux→PRD | `"references"` | ✓ |
| `relationship-mapper`: story deps | `"depends-on"` | ✓ |

All `targetType` values are `"spec"` or `"issue"` ✓. All `targetId` values are valid BMAD IDs ✓.

### Q9: Are ALL ExternalChange objects valid? (entity_id, entity_type, change_type, timestamp)

**PASS** — All three change paths in `getChangesSince()` produce valid objects:

| Change | entity_id | entity_type | change_type | timestamp |
|--------|-----------|-------------|-------------|-----------|
| Created | ✓ | ✓ from entity | `"created"` | ✓ `created_at` or now |
| Updated | ✓ | ✓ from entity | `"updated"` | ✓ `updated_at` or now |
| Deleted | ✓ | ✓ via `parseBmadId` | `"deleted"` | ✓ now |

### Q10: Does configSchema match PluginConfigSchema format?

**PASS** — Schema is well-formed:
- `type: "object"` ✓
- `properties` contains valid entries with `type`, `title`, `description`, `default` ✓
- `required: ["path"]` ✓
- Property types are valid: `"string"`, `"boolean"` ✓

### Q11: Are IDs compatible with sudocode's ID system?

**PASS** — BMAD IDs (`bm-prd`, `bme-1`, `bms-1-3`) are external IDs, not sudocode IDs. The sync-coordinator generates proper sudocode IDs (`s-xxxx`, `i-xxxx`) independently via `createSpecFromExternal` / `createIssueFromExternal` and links them via `external_links`. BMAD IDs are deterministic and collision-resistant within the BMAD namespace.

### Q12: Does the sync-coordinator.ts expect anything from providers that we don't implement?

**FAIL — Missing `validate()` method**

The sync-coordinator (line 139) calls `provider.validate()` during startup:
```typescript
const validation = await provider.validate();
if (!validation.valid) { ... }
```

BmadProvider does **not** implement `validate()`. This will cause a **runtime error** (`provider.validate is not a function`) when the sync-coordinator initializes the BMAD provider.

Both reference plugins (OpenSpec and Beads) implement `validate()`. This method is defined in `cli/src/integrations/types.ts` (the local IntegrationProvider interface the coordinator imports), though it is NOT in the canonical `@sudocode-ai/types` IntegrationProvider.

---

## Issues Summary

### CRITICAL Issues

#### C1: Missing `validate()` method on BmadProvider
**File:** `plugin.ts`
**Impact:** Runtime crash when sync-coordinator initializes the BMAD provider
**Details:** `cli/src/integrations/sync-coordinator.ts:139` calls `provider.validate()` on all enabled providers. BmadProvider doesn't implement this method.
**Fix:** Add `validate()` to BmadProvider, following the pattern from OpenSpec/Beads:
```typescript
async validate(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  if (!existsSync(this.resolvedPath)) {
    errors.push(`BMAD output directory not found: ${this.resolvedPath}`);
  }
  return { valid: errors.length === 0, errors };
}
```

### IMPORTANT Issues

#### I1: `searchEntities` ignores query parameter
**File:** `plugin.ts:214`
**Impact:** If the sync-coordinator or UI ever passes a query string, BMAD won't filter results
**Details:** Signature is `async searchEntities(): Promise<ExternalEntity[]>` — no `query` param. OpenSpec filters by query (line 301: `matchesQuery`).
**Fix:** Accept `query?: string` and optionally filter, even if `supportsSearch = false`. At minimum, match the signature for interface conformance.

#### I2: `mapToSudocode` return type includes undeclared `relationships` field
**File:** `plugin.ts:535-541`, `entity-mapper.ts:238-275`
**Impact:** Misleading — suggests sync-coordinator uses relationships from mapToSudocode, but it reads them from ExternalEntity.relationships instead
**Details:** The extra `relationships` in the return type is not consumed by the sync-coordinator. OpenSpec does the same, so this appears to be a cross-cutting pattern issue, not BMAD-specific.
**Fix:** Either remove the extra field from the return type, or document that it's for non-coordinator consumers.

#### I3: `relationship-mapper.ts` is exported but not integrated into the sync flow
**File:** `relationship-mapper.ts`
**Impact:** The `mapProjectRelationships()` function returns `MappedRelationship[]` (with `fromId`/`targetId`), but the sync-coordinator processes `ExternalRelationship[]` (from `ExternalEntity.relationships`). These are different formats.
**Details:** Relationships from the relationship-mapper would need to be converted to `ExternalRelationship` format and attached to `ExternalEntity.relationships` to be processed. Currently, entity-mapper.ts creates relationships directly in ExternalEntity format, making relationship-mapper redundant for the sync flow.
**Fix:** Either integrate relationship-mapper by calling it from searchEntities and merging results into entity relationships, or document it as a library utility for non-sync consumers.

#### I4: Dual IntegrationProvider interface divergence
**File:** Cross-cutting: `types/src/integrations.d.ts` vs `cli/src/integrations/types.ts`
**Impact:** Plugins implement the canonical interface from `@sudocode-ai/types`, but the sync-coordinator imports the local interface which has additional requirements (`validate()`, `initialize(config)`, `parseExternalId()`, `formatExternalId()`).
**Details:** This is a pre-existing architectural issue, not BMAD-specific. Both OpenSpec and Beads work around it by implementing the superset. BMAD should do the same.
**Fix (BMAD-specific):** Add `validate()` to BmadProvider (see C1). The other local-only methods (`parseExternalId`, `formatExternalId`) are defined but never called by the coordinator, so they're not strictly needed.

### MINOR Issues

#### M1: Inconsistent `planningDir` variable scope
**File:** `plugin.ts:226,260`
**Impact:** `planningDir` is declared inside the `if (existsSync(planningDir))` block scope at line 226, then used again at line 260 for the epics directory. If `planningDir` doesn't exist, `epicsDir` construction at line 260 still references the original (undefined `planningDir` would be fine since it's `const` and used in `path.join`). Actually on closer inspection, `planningDir` is declared at line 226 and used through line 269 — it's in function scope, so this works. No issue.

#### M2: `fetchEntity` performs full scan via `searchEntities()`
**File:** `plugin.ts:209-212`
**Impact:** O(n) lookup — every `fetchEntity` call rescans all BMAD files
**Details:** This is acceptable for file-based providers (OpenSpec does the same pattern). Could be optimized with caching if performance becomes an issue.

#### M3: Sprint status slug matching may miss entities
**File:** `entity-mapper.ts:352-359`
**Impact:** `applySprintStatus` matches stories by `raw.slug` but inline stories (created in plugin.ts:288-309) don't set a `slug` in their raw data. Sprint status won't apply to inline stories that haven't been overridden by standalone story files.
**Fix:** Either add `slug` derivation for inline stories, or match by epic/story number instead of slug.

#### M4: No `ExternalRelationship` import — type derived inline
**File:** `entity-mapper.ts:15`
**Impact:** Style inconsistency — `ExternalRelationship` type is derived as `NonNullable<ExternalEntity["relationships"]>[number]` instead of importing directly from `@sudocode-ai/types`
**Details:** `ExternalRelationship` is exported from `@sudocode-ai/types` (integrations.d.ts:200-207). Direct import would be cleaner.

#### M5: Relationship-mapper uses `targetId`/`targetType` naming inconsistency
**File:** `relationship-mapper.ts:46-49`
**Impact:** `MappedRelationship` uses field names that differ from both `ExternalRelationship` (`targetId`) and `RelationshipJSONL` (`to`/`to_type`). This creates confusion about which format is in play.

---

## Recommended Fixes (Priority Order)

1. **[CRITICAL] Add `validate()` method** to BmadProvider — required for sync-coordinator startup
2. **[IMPORTANT] Add `query` parameter** to `searchEntities` signature — for interface conformance
3. **[IMPORTANT] Fix sprint status matching** for inline stories that lack `slug` in raw data
4. **[MINOR] Import `ExternalRelationship`** directly from `@sudocode-ai/types`
5. **[MINOR] Document relationship-mapper** as a utility export, or integrate it into the sync flow
