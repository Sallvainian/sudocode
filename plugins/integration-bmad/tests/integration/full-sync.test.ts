/**
 * Full Sync Integration Test
 *
 * End-to-end test: set up a _bmad-output/ directory with BMAD artifacts,
 * initialize BmadProvider, call searchEntities(), and verify specs/issues
 * are created with correct relationships and sprint status overlay.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, existsSync, rmSync, cpSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import type { ExternalEntity } from "@sudocode-ai/types";
import bmadPlugin from "../../src/plugin.js";

/** Helper to extract entity array from searchEntities result */
async function getEntities(provider: ReturnType<typeof bmadPlugin.createProvider>): Promise<ExternalEntity[]> {
  const result = await provider.searchEntities();
  return Array.isArray(result) ? result : (result as any).results;
}

// =============================================================================
// Test Context
// =============================================================================

interface TestContext {
  testDir: string;
  bmadOutputDir: string;
  cleanup: () => void;
}

function createTestContext(): TestContext {
  const testDir = join(
    tmpdir(),
    `bmad-integration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const bmadOutputDir = join(testDir, "_bmad-output");

  mkdirSync(join(bmadOutputDir, "planning-artifacts", "epics"), { recursive: true });
  mkdirSync(join(bmadOutputDir, "implementation-artifacts"), { recursive: true });

  return {
    testDir,
    bmadOutputDir,
    cleanup: () => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    },
  };
}

// =============================================================================
// Fixture Helpers
// =============================================================================

function writePrd(ctx: TestContext, content?: string): void {
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "PRD.md"),
    content ??
      `---
stepsCompleted: ["discovery", "requirements"]
version: "1.0"
---

# PlantPal - Product Requirements Document

## Overview

PlantPal is a mobile app for plant care.

## Functional Requirements

### FR-1: Plant Identification

Users can photograph a plant and receive identification results.
`,
  );
}

function writeArchitecture(ctx: TestContext, content?: string): void {
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "architecture.md"),
    content ??
      `---
stepsCompleted: ["tech-stack"]
---

# PlantPal - Architecture Document

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with Express
`,
  );
}

function writeUxSpec(ctx: TestContext): void {
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "ux-spec.md"),
    `# PlantPal - UX Specification

## Design System

Material Design 3 with a green/earth-tone palette.
`,
  );
}

function writeProductBrief(ctx: TestContext): void {
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "product-brief.md"),
    `# PlantPal - Product Brief

## Vision

Make plant care effortless.
`,
  );
}

function writeProjectContext(ctx: TestContext): void {
  writeFileSync(
    join(ctx.bmadOutputDir, "project-context.md"),
    `# PlantPal - Project Context

## Technology Stack

- React Native + Expo
- Express + Prisma
`,
  );
}

function writeEpic(ctx: TestContext, epicNumber: number, title: string, stories: string[] = []): void {
  let content = `## Epic ${epicNumber}: ${title}\n\nDescription of epic ${epicNumber}.\n`;
  for (let i = 0; i < stories.length; i++) {
    content += `\n### Story ${epicNumber}.${i + 1}: ${stories[i]}\n\nAs a user, I want ${stories[i].toLowerCase()}.\n`;
  }
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "epics", `epic-${epicNumber}.md`),
    content,
  );
}

function writeStoryFile(
  ctx: TestContext,
  epicNumber: number,
  storyNumber: number,
  slug: string,
  options: { status?: string; acceptanceCriteria?: boolean; tasks?: boolean } = {},
): void {
  let content = `# Story ${epicNumber}.${storyNumber}: ${slug.replace(/-/g, " ")}\n\n`;

  if (options.status) {
    content += `Status: ${options.status}\n\n`;
  }

  content += `## Story\n\nAs a user, I want to ${slug.replace(/-/g, " ")}.\n`;

  if (options.acceptanceCriteria) {
    content += `\n## Acceptance Criteria\n\n`;
    content += `**Given** the user is logged in\n`;
    content += `**When** they perform the action\n`;
    content += `**Then** the expected result occurs\n`;
  }

  if (options.tasks) {
    content += `\n## Tasks / Subtasks\n\n`;
    content += `- [ ] Task 1\n`;
    content += `- [x] Task 2\n`;
  }

  writeFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", `story-${epicNumber}-${storyNumber}-${slug}.md`),
    content,
  );
}

function writeSprintStatus(ctx: TestContext, statuses: Record<string, string>): void {
  let yaml = `generated: 03-15-2026 10:00\nlast_updated: 03-20-2026 14:30\nproject: PlantPal\n\ndevelopment_status:\n`;
  for (const [key, status] of Object.entries(statuses)) {
    yaml += `  ${key}: ${status}\n`;
  }
  writeFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", "sprint-status.yaml"),
    yaml,
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("Full Sync Integration", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  describe("Plugin validation", () => {
    it("validates config with path", () => {
      const result = bmadPlugin.validateConfig({ path: "_bmad-output" });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects config without path", () => {
      const result = bmadPlugin.validateConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("warns on invalid prefix format", () => {
      const result = bmadPlugin.validateConfig({
        path: "_bmad-output",
        spec_prefix: "toolong",
      });
      expect(result.valid).toBe(true);
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe("Test connection", () => {
    it("succeeds when _bmad-output exists", async () => {
      const result = await bmadPlugin.testConnection(
        { path: "_bmad-output" },
        ctx.testDir,
      );
      expect(result.success).toBe(true);
    });

    it("fails when directory does not exist", async () => {
      const result = await bmadPlugin.testConnection(
        { path: "_bmad-output" },
        "/nonexistent/path",
      );
      expect(result.success).toBe(false);
    });
  });

  describe("searchEntities — planning artifacts as specs", () => {
    it("imports PRD as spec", async () => {
      writePrd(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const prd = entities.find((e) => e.id === "bm-prd");
      expect(prd).toBeDefined();
      expect(prd!.type).toBe("spec");
      expect(prd!.title).toContain("PlantPal");
    });

    it("imports architecture as spec", async () => {
      writeArchitecture(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const arch = entities.find((e) => e.id === "bm-arch");
      expect(arch).toBeDefined();
      expect(arch!.type).toBe("spec");
    });

    it("imports all planning artifacts", async () => {
      writePrd(ctx);
      writeArchitecture(ctx);
      writeUxSpec(ctx);
      writeProductBrief(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const specs = entities.filter((e) => e.type === "spec");
      expect(specs.length).toBe(4);

      const ids = specs.map((e) => e.id);
      expect(ids).toContain("bm-prd");
      expect(ids).toContain("bm-arch");
      expect(ids).toContain("bm-ux");
      expect(ids).toContain("bm-brief");
    });

    it("imports project-context when enabled (default)", async () => {
      writeProjectContext(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const ctx_spec = entities.find((e) => e.id === "bm-ctx");
      expect(ctx_spec).toBeDefined();
      expect(ctx_spec!.type).toBe("spec");
    });

    it("skips project-context when disabled", async () => {
      writeProjectContext(ctx);

      const provider = bmadPlugin.createProvider(
        { path: "_bmad-output", import_project_context: false },
        ctx.testDir,
      );
      await provider.initialize();
      const entities = await getEntities(provider);

      const ctx_spec = entities.find((e) => e.id === "bm-ctx");
      expect(ctx_spec).toBeUndefined();
    });
  });

  describe("searchEntities — epics and stories as issues", () => {
    it("imports epics with inline stories", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "User Authentication", ["User Registration", "User Login"]);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const epic = entities.find((e) => e.id === "bme-1");
      expect(epic).toBeDefined();
      expect(epic!.type).toBe("issue");
      expect(epic!.title).toContain("User Authentication");

      // Inline stories
      const story11 = entities.find((e) => e.id === "bms-1-1");
      expect(story11).toBeDefined();
      expect(story11!.type).toBe("issue");
      expect(story11!.title).toContain("User Registration");

      const story12 = entities.find((e) => e.id === "bms-1-2");
      expect(story12).toBeDefined();
    });

    it("standalone story files override inline stories", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "User Authentication", ["User Registration"]);
      writeStoryFile(ctx, 1, 1, "user-registration", {
        status: "in-progress",
        acceptanceCriteria: true,
        tasks: true,
      });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const story = entities.find((e) => e.id === "bms-1-1");
      expect(story).toBeDefined();
      // Standalone file has acceptance criteria in description
      expect(story!.description).toContain("Acceptance Criteria");
      // Should have raw data from standalone file
      const raw = story!.raw as Record<string, unknown>;
      expect(raw.entityKind).toBe("story");
      expect(raw.filePath).toBeDefined();
    });

    it("handles multiple epics", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Authentication", ["Registration", "Login"]);
      writeEpic(ctx, 2, "Plant Management", ["Add Plant"]);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const epics = entities.filter(
        (e) => e.type === "issue" && (e.raw as Record<string, unknown>)?.entityKind === "epic",
      );
      expect(epics.length).toBe(2);

      const stories = entities.filter(
        (e) => e.type === "issue" && (e.raw as Record<string, unknown>)?.entityKind === "story",
      );
      expect(stories.length).toBe(3);
    });
  });

  describe("searchEntities — relationships", () => {
    it("epics implement PRD spec", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Authentication", []);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const epic = entities.find((e) => e.id === "bme-1");
      expect(epic!.relationships).toBeDefined();
      const implementsRel = epic!.relationships!.find(
        (r) => r.relationshipType === "implements" && r.targetId === "bm-prd",
      );
      expect(implementsRel).toBeDefined();
      expect(implementsRel!.targetType).toBe("spec");
    });

    it("stories implement their parent epic", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Authentication", ["Registration"]);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const story = entities.find((e) => e.id === "bms-1-1");
      expect(story!.relationships).toBeDefined();
      const implementsRel = story!.relationships!.find(
        (r) => r.relationshipType === "implements" && r.targetId === "bme-1",
      );
      expect(implementsRel).toBeDefined();
      expect(implementsRel!.targetType).toBe("issue");
    });

    it("creates full hierarchy chain: stories → epics → PRD", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", ["Registration", "Login"]);
      writeEpic(ctx, 2, "Plants", ["Add Plant"]);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      // Epic 1 implements PRD
      const epic1 = entities.find((e) => e.id === "bme-1");
      expect(epic1!.relationships!.some((r) => r.targetId === "bm-prd")).toBe(true);

      // Epic 2 implements PRD
      const epic2 = entities.find((e) => e.id === "bme-2");
      expect(epic2!.relationships!.some((r) => r.targetId === "bm-prd")).toBe(true);

      // Story 1.1 implements Epic 1
      const story11 = entities.find((e) => e.id === "bms-1-1");
      expect(story11!.relationships!.some((r) => r.targetId === "bme-1")).toBe(true);

      // Story 2.1 implements Epic 2
      const story21 = entities.find((e) => e.id === "bms-2-1");
      expect(story21!.relationships!.some((r) => r.targetId === "bme-2")).toBe(true);
    });
  });

  describe("searchEntities — sprint status overlay", () => {
    it("applies sprint status to stories", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", ["User Registration"]);
      writeStoryFile(ctx, 1, 1, "user-registration", { status: "ready-for-dev" });
      writeSprintStatus(ctx, {
        "epic-1": "in-progress",
        "1-1-user-registration": "done",
      });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      // Story status should be overridden by sprint-status.yaml
      const story = entities.find((e) => e.id === "bms-1-1");
      expect(story!.status).toBe("closed"); // done → closed
    });

    it("applies sprint status to epics", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", []);
      writeSprintStatus(ctx, { "epic-1": "in-progress" });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const epic = entities.find((e) => e.id === "bme-1");
      expect(epic!.status).toBe("in_progress");
    });

    it("skips sprint status when disabled", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", ["Registration"]);
      writeStoryFile(ctx, 1, 1, "user-registration", { status: "ready-for-dev" });
      writeSprintStatus(ctx, { "1-1-user-registration": "done" });

      const provider = bmadPlugin.createProvider(
        { path: "_bmad-output", sync_sprint_status: false },
        ctx.testDir,
      );
      await provider.initialize();
      const entities = await getEntities(provider);

      // Without sprint overlay, story keeps its file-based status
      const story = entities.find((e) => e.id === "bms-1-1");
      expect(story!.status).toBe("open"); // ready-for-dev → open
    });
  });

  describe("searchEntities — entity ordering", () => {
    it("returns specs before epics before stories", async () => {
      writePrd(ctx);
      writeArchitecture(ctx);
      writeEpic(ctx, 1, "Auth", ["Registration", "Login"]);
      writeStoryFile(ctx, 1, 1, "user-registration", { status: "ready-for-dev" });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      // Find indexes of first spec, first epic, first story
      const firstSpecIdx = entities.findIndex((e) => e.type === "spec");
      const firstEpicIdx = entities.findIndex(
        (e) => (e.raw as Record<string, unknown>)?.entityKind === "epic",
      );
      const firstStoryIdx = entities.findIndex(
        (e) => (e.raw as Record<string, unknown>)?.entityKind === "story",
      );

      expect(firstSpecIdx).toBeLessThan(firstEpicIdx);
      expect(firstEpicIdx).toBeLessThan(firstStoryIdx);
    });
  });

  describe("searchEntities — custom prefixes", () => {
    it("uses custom ID prefixes", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", ["Registration"]);

      const provider = bmadPlugin.createProvider(
        {
          path: "_bmad-output",
          spec_prefix: "pp",
          epic_prefix: "ppe",
          story_prefix: "pps",
        },
        ctx.testDir,
      );
      await provider.initialize();
      const entities = await getEntities(provider);

      expect(entities.some((e) => e.id === "pp-prd")).toBe(true);
      expect(entities.some((e) => e.id === "ppe-1")).toBe(true);
      expect(entities.some((e) => e.id === "pps-1-1")).toBe(true);
    });
  });

  describe("mapToSudocode", () => {
    it("maps spec entities to Spec partials", async () => {
      writePrd(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const prd = entities.find((e) => e.id === "bm-prd")!;
      const mapped = provider.mapToSudocode(prd);

      expect(mapped.spec).toBeDefined();
      expect(mapped.spec!.title).toContain("PlantPal");
      expect(mapped.spec!.content).toBeDefined();
      expect(mapped.issue).toBeUndefined();
    });

    it("maps issue entities to Issue partials", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", ["Registration"]);
      writeStoryFile(ctx, 1, 1, "user-registration", { status: "in-progress" });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const story = entities.find((e) => e.id === "bms-1-1")!;
      const mapped = provider.mapToSudocode(story);

      expect(mapped.issue).toBeDefined();
      expect(mapped.issue!.title).toBeDefined();
      expect(mapped.issue!.status).toBe("in_progress");
      expect((mapped as any).relationships).toBeDefined();
      expect(mapped.spec).toBeUndefined();
    });
  });

  describe("fetchEntity", () => {
    it("returns entity by ID", async () => {
      writePrd(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      const entity = await provider.fetchEntity("bm-prd");
      expect(entity).toBeDefined();
      expect(entity!.id).toBe("bm-prd");
      expect(entity!.type).toBe("spec");
    });

    it("returns null for unknown ID", async () => {
      writePrd(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      const entity = await provider.fetchEntity("nonexistent");
      expect(entity).toBeNull();
    });
  });

  describe("Change detection", () => {
    it("detects all entities as created on first scan", async () => {
      writePrd(ctx);
      writeEpic(ctx, 1, "Auth", ["Registration"]);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      const changes = await provider.getChangesSince(new Date(0));
      expect(changes.length).toBeGreaterThanOrEqual(3); // PRD + epic + story

      const created = changes.filter((c) => c.change_type === "created");
      expect(created.length).toBe(changes.length);
    });

    it("detects no changes on second scan without modifications", async () => {
      writePrd(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // First scan establishes baseline
      await provider.getChangesSince(new Date(0));

      // Second scan should show no changes
      const changes = await provider.getChangesSince(new Date(0));
      expect(changes.length).toBe(0);
    });

    it("detects updated entities after file modification", async () => {
      writePrd(ctx);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // First scan
      await provider.getChangesSince(new Date(0));

      // Modify PRD
      writePrd(ctx, `# Updated PRD\n\n## Overview\n\nThis is a completely new PRD.`);

      // Should detect the update
      const changes = await provider.getChangesSince(new Date(0));
      const prdChange = changes.find((c) => c.entity_id === "bm-prd");
      expect(prdChange).toBeDefined();
      expect(prdChange!.change_type).toBe("updated");
    });
  });

  describe("Full project sync (using fixture bmad-output)", () => {
    it("syncs the complete fixture project", async () => {
      const fixturesDir = join(__dirname, "..", "fixtures", "bmad-output");

      // Copy fixtures to temp dir
      const bmadDir = join(ctx.testDir, "bmad-fixtures");
      cpSync(fixturesDir, bmadDir, { recursive: true });

      const provider = bmadPlugin.createProvider({ path: "bmad-fixtures" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      // Verify specs: PRD, architecture, ux-spec, product-brief, project-context
      const specs = entities.filter((e) => e.type === "spec");
      expect(specs.length).toBeGreaterThanOrEqual(4); // At least PRD, arch, ux, brief

      // Verify epics
      const epics = entities.filter(
        (e) => (e.raw as Record<string, unknown>)?.entityKind === "epic",
      );
      expect(epics.length).toBe(2); // Epic 1 and Epic 2

      // Verify stories
      const stories = entities.filter(
        (e) => (e.raw as Record<string, unknown>)?.entityKind === "story",
      );
      expect(stories.length).toBeGreaterThanOrEqual(4); // At least stories from both epics

      // Verify sprint status was applied
      const story11 = entities.find((e) => e.id === "bms-1-1");
      expect(story11).toBeDefined();
      // Sprint status says 1-1-user-registration: done → closed
      expect(story11!.status).toBe("closed");

      const story21 = entities.find((e) => e.id === "bms-2-1");
      expect(story21).toBeDefined();
      // Sprint status says 2-1-add-plant: in-progress → in_progress
      expect(story21!.status).toBe("in_progress");

      // Verify relationship chain: story → epic → PRD
      const epic1 = entities.find((e) => e.id === "bme-1")!;
      expect(epic1.relationships!.some((r) => r.targetId === "bm-prd")).toBe(true);

      expect(story11!.relationships!.some((r) => r.targetId === "bme-1")).toBe(true);
    });
  });

  describe("Empty / edge cases", () => {
    it("handles empty bmad-output directory", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);
      expect(entities.length).toBe(0);
    });

    it("handles missing planning-artifacts directory", async () => {
      rmSync(join(ctx.bmadOutputDir, "planning-artifacts"), { recursive: true, force: true });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);
      expect(entities.length).toBe(0);
    });

    it("handles epics without PRD (no implements relationship)", async () => {
      // No PRD written
      writeEpic(ctx, 1, "Auth", ["Registration"]);

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const epic = entities.find((e) => e.id === "bme-1");
      expect(epic).toBeDefined();
      // No PRD → no implements relationship on epic
      expect(epic!.relationships ?? []).toHaveLength(0);
    });
  });
});
