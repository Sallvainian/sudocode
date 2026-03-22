/**
 * Bidirectional Sync Integration Test
 *
 * Tests the write-back path: sync inbound (BMAD→sudocode), then change
 * issue status in sudocode and call updateEntity() to verify sprint-status.yaml
 * and story files are updated correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { load as loadYaml } from "js-yaml";

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
    `bmad-bidir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

function setupFullProject(ctx: TestContext): void {
  // PRD
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "PRD.md"),
    `---
version: "1.0"
---

# PlantPal - PRD

## Overview

PlantPal helps with plant care.
`,
  );

  // Epic 1
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "epics", "epic-1.md"),
    `## Epic 1: User Authentication

User account management.

### Story 1.1: User Registration

As a new user, I want to register.

### Story 1.2: User Login

As a user, I want to log in.
`,
  );

  // Epic 2
  writeFileSync(
    join(ctx.bmadOutputDir, "planning-artifacts", "epics", "epic-2.md"),
    `## Epic 2: Plant Management

Plant tracking features.

### Story 2.1: Add Plant

As a user, I want to add a plant.
`,
  );

  // Standalone story files
  writeFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", "story-1-1-user-registration.md"),
    `# Story 1.1: User Registration

Status: ready-for-dev

## Story

As a new user, I want to register.

## Acceptance Criteria

**Given** a valid email
**When** the user submits the form
**Then** an account is created
`,
  );

  writeFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", "story-2-1-add-plant.md"),
    `# Story 2.1: Add Plant

Status: in-progress

## Story

As a user, I want to add a plant.

## Tasks / Subtasks

- [x] Create schema
- [ ] Build API
`,
  );

  // Sprint status
  writeFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", "sprint-status.yaml"),
    `generated: 03-15-2026 10:00
last_updated: 03-20-2026 14:30
project: PlantPal

development_status:
  epic-1: in-progress
  1-1-user-registration: ready-for-dev
  1-2-user-login: backlog
  epic-2: backlog
  2-1-add-plant: in-progress
`,
  );
}

function readSprintStatus(ctx: TestContext): Record<string, string> {
  const content = readFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", "sprint-status.yaml"),
    "utf-8",
  );
  const parsed = loadYaml(content) as Record<string, unknown>;
  return (parsed.development_status ?? {}) as Record<string, string>;
}

function readStoryFileStatus(ctx: TestContext, filename: string): string | undefined {
  const content = readFileSync(
    join(ctx.bmadOutputDir, "implementation-artifacts", filename),
    "utf-8",
  );
  const match = content.match(/^Status:\s*(.+)$/im);
  return match?.[1]?.trim();
}

// =============================================================================
// Tests
// =============================================================================

describe("Bidirectional Sync Integration", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
    setupFullProject(ctx);
  });

  afterEach(() => {
    ctx.cleanup();
  });

  describe("Inbound sync (BMAD → sudocode)", () => {
    it("imports all entities with correct statuses", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();
      const entities = await getEntities(provider);

      const story11 = entities.find((e) => e.id === "bms-1-1");
      expect(story11).toBeDefined();
      expect(story11!.status).toBe("open"); // ready-for-dev → open

      const story21 = entities.find((e) => e.id === "bms-2-1");
      expect(story21).toBeDefined();
      expect(story21!.status).toBe("in_progress"); // in-progress → in_progress

      const epic1 = entities.find((e) => e.id === "bme-1");
      expect(epic1!.status).toBe("in_progress");

      const epic2 = entities.find((e) => e.id === "bme-2");
      expect(epic2!.status).toBe("open"); // backlog → open
    });
  });

  describe("Outbound sync — story status updates", () => {
    it("updates sprint-status.yaml when story status changes to closed", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Verify initial state
      let statuses = readSprintStatus(ctx);
      expect(statuses["1-1-user-registration"]).toBe("ready-for-dev");

      // Close the story in sudocode
      await provider.updateEntity("bms-1-1", { status: "closed" } as any);

      // Verify sprint-status.yaml was updated
      statuses = readSprintStatus(ctx);
      expect(statuses["1-1-user-registration"]).toBe("done");
    });

    it("updates story file Status line when status changes", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Verify initial status
      let fileStatus = readStoryFileStatus(ctx, "story-1-1-user-registration.md");
      expect(fileStatus).toBe("ready-for-dev");

      // Mark as in-progress
      await provider.updateEntity("bms-1-1", { status: "in_progress" } as any);

      // Verify file status updated
      fileStatus = readStoryFileStatus(ctx, "story-1-1-user-registration.md");
      expect(fileStatus).toBe("in-progress");
    });

    it("updates both sprint-status.yaml and story file", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      await provider.updateEntity("bms-2-1", { status: "needs_review" } as any);

      // Sprint status should be "review"
      const statuses = readSprintStatus(ctx);
      expect(statuses["2-1-add-plant"]).toBe("review");

      // Story file should be "review"
      const fileStatus = readStoryFileStatus(ctx, "story-2-1-add-plant.md");
      expect(fileStatus).toBe("review");
    });

    it("maps all sudocode statuses correctly on write-back", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      const statusMappings: Array<[string, string]> = [
        ["open", "ready-for-dev"],
        ["in_progress", "in-progress"],
        ["needs_review", "review"],
        ["closed", "done"],
      ];

      for (const [sudocodeStatus, expectedBmadStatus] of statusMappings) {
        await provider.updateEntity("bms-1-1", { status: sudocodeStatus } as any);
        const statuses = readSprintStatus(ctx);
        expect(statuses["1-1-user-registration"]).toBe(expectedBmadStatus);
      }
    });
  });

  describe("Outbound sync — epic status updates", () => {
    it("updates sprint-status.yaml when epic status changes", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      let statuses = readSprintStatus(ctx);
      expect(statuses["epic-1"]).toBe("in-progress");

      await provider.updateEntity("bme-1", { status: "closed" } as any);

      statuses = readSprintStatus(ctx);
      expect(statuses["epic-1"]).toBe("done");
    });

    it("maps all sudocode statuses for epics correctly", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      const statusMappings: Array<[string, string]> = [
        ["open", "backlog"],
        ["in_progress", "in-progress"],
        ["closed", "done"],
      ];

      for (const [sudocodeStatus, expectedBmadStatus] of statusMappings) {
        await provider.updateEntity("bme-2", { status: sudocodeStatus } as any);
        const statuses = readSprintStatus(ctx);
        expect(statuses["epic-2"]).toBe(expectedBmadStatus);
      }
    });
  });

  describe("Round-trip sync", () => {
    it("can read, update, and re-read consistently", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Read initial state
      let entities = await getEntities(provider);
      const initialStory = entities.find((e) => e.id === "bms-1-1")!;
      expect(initialStory.status).toBe("open"); // ready-for-dev → open

      // Update story status
      await provider.updateEntity("bms-1-1", { status: "in_progress" } as any);

      // Re-read and verify
      entities = await getEntities(provider);
      const updatedStory = entities.find((e) => e.id === "bms-1-1")!;
      expect(updatedStory.status).toBe("in_progress");
    });

    it("change detection reflects outbound writes", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Establish baseline
      await provider.getChangesSince(new Date(0));

      // Update a story
      await provider.updateEntity("bms-1-1", { status: "closed" } as any);

      // The provider refreshes hashes internally after updateEntity,
      // so a subsequent getChangesSince should not show stale changes
      const changes = await provider.getChangesSince(new Date(0));

      // No false-positive changes after internal refresh
      const storyChange = changes.find((c) => c.entity_id === "bms-1-1");
      expect(storyChange).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("ignores updateEntity for unknown ID format", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Should not throw
      await provider.updateEntity("unknown-id", { status: "closed" } as any);

      // Sprint status should be unchanged
      const statuses = readSprintStatus(ctx);
      expect(statuses["1-1-user-registration"]).toBe("ready-for-dev");
    });

    it("ignores updateEntity for spec IDs (not writable)", async () => {
      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Specs are read-only in BMAD
      await provider.updateEntity("bm-prd", { title: "New Title" } as any);

      // No crash, PRD content unchanged
      const entities = await getEntities(provider);
      const prd = entities.find((e) => e.id === "bm-prd");
      expect(prd!.title).toContain("PlantPal");
    });

    it("handles missing sprint-status.yaml gracefully", async () => {
      // Remove sprint-status.yaml
      const sprintPath = join(ctx.bmadOutputDir, "implementation-artifacts", "sprint-status.yaml");
      rmSync(sprintPath, { force: true });

      const provider = bmadPlugin.createProvider({ path: "_bmad-output" }, ctx.testDir);
      await provider.initialize();

      // Should not throw when trying to update
      await provider.updateEntity("bms-1-1", { status: "closed" } as any);
    });
  });
});
