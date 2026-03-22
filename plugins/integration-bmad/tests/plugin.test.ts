import { describe, it, expect } from "vitest";
import * as path from "path";
import bmadPlugin from "../src/plugin.js";

const BMAD_OUTPUT = path.join(__dirname, "fixtures", "bmad-output");

describe("bmadPlugin", () => {
  describe("validateConfig", () => {
    it("validates with a valid path", () => {
      const result = bmadPlugin.validateConfig({ path: "_bmad-output" });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails without a path", () => {
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

  describe("testConnection", () => {
    it("succeeds for existing directory", async () => {
      const result = await bmadPlugin.testConnection(
        { path: "tests/fixtures/bmad-output" },
        path.join(__dirname, ".."),
      );
      expect(result.success).toBe(true);
      expect(result.details?.hasPlanningDir).toBe(true);
      expect(result.details?.hasImplDir).toBe(true);
    });

    it("fails for non-existent directory", async () => {
      const result = await bmadPlugin.testConnection(
        { path: "nonexistent" },
        path.join(__dirname, ".."),
      );
      expect(result.success).toBe(false);
    });

    it("fails without path configured", async () => {
      const result = await bmadPlugin.testConnection({}, "/tmp");
      expect(result.success).toBe(false);
    });
  });
});

describe("BmadProvider", () => {
  function createProvider() {
    return bmadPlugin.createProvider(
      { path: BMAD_OUTPUT },
      "/", // projectPath — resolvedPath will be BMAD_OUTPUT since it's absolute
    );
  }

  describe("searchEntities", () => {
    it("returns entities in correct order: specs, epics, stories", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      // Find boundaries
      const firstEpicIdx = entities.findIndex((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "epic";
      });
      const firstStoryIdx = entities.findIndex((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "story";
      });

      // All specs come before epics
      for (let i = 0; i < firstEpicIdx; i++) {
        expect(entities[i].type).toBe("spec");
      }

      // All epics come before stories
      if (firstStoryIdx >= 0) {
        expect(firstStoryIdx).toBeGreaterThan(firstEpicIdx);
        for (let i = firstEpicIdx; i < firstStoryIdx; i++) {
          const raw = entities[i].raw as Record<string, unknown>;
          expect(raw?.entityKind).toBe("epic");
        }
      }
    });

    it("returns spec entities for planning artifacts", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      const specs = entities.filter((e) => e.type === "spec");
      expect(specs.length).toBeGreaterThanOrEqual(1);

      const prd = specs.find((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.artifactType === "prd";
      });
      expect(prd).toBeDefined();
      expect(prd!.title).toContain("Product Requirements Document");
    });

    it("returns epic entities", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      const epics = entities.filter((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "epic";
      });
      expect(epics.length).toBe(2);
      expect(epics[0].type).toBe("issue");
    });

    it("returns story entities from standalone files", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      const stories = entities.filter((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "story" && raw?.source !== "inline";
      });
      expect(stories.length).toBeGreaterThanOrEqual(2);
    });

    it("standalone stories override inline stories with same ID", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      // Story 1-1 exists as both inline (from epic-1.md) and standalone
      const story11 = entities.filter((e) => {
        const raw = e.raw as Record<string, unknown>;
        return (
          raw?.entityKind === "story" &&
          raw?.epicNumber === 1 &&
          raw?.storyNumber === 1
        );
      });
      // Should only appear once (standalone replaces inline)
      expect(story11).toHaveLength(1);
      // Standalone stories have a filePath and slug
      const raw = story11[0].raw as Record<string, unknown>;
      expect(raw.filePath).toBeDefined();
      expect(raw.slug).toBeDefined();
    });

    it("applies sprint status overlay to epics", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      const epics = entities.filter((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "epic";
      });

      // Epic 1 is "in-progress" in sprint-status.yaml → maps to "in_progress"
      const epic1 = epics.find((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.epicNumber === 1;
      });
      expect(epic1).toBeDefined();
      expect(epic1!.status).toBe("in_progress");
    });

    it("creates implements relationships from epics to PRD", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      const epic = entities.find((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "epic";
      });
      expect(epic).toBeDefined();
      expect(epic!.relationships).toBeDefined();

      const prdRel = epic!.relationships!.find(
        (r) => r.relationshipType === "implements" && r.targetType === "spec",
      );
      expect(prdRel).toBeDefined();
    });

    it("creates implements relationships from stories to epics", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();

      const story = entities.find((e) => {
        const raw = e.raw as Record<string, unknown>;
        return raw?.entityKind === "story";
      });
      expect(story).toBeDefined();
      expect(story!.relationships).toBeDefined();

      const epicRel = story!.relationships!.find(
        (r) =>
          r.relationshipType === "implements" && r.targetType === "issue",
      );
      expect(epicRel).toBeDefined();
    });
  });

  describe("fetchEntity", () => {
    it("fetches an entity by external ID", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();
      const firstId = entities[0].id;

      const entity = await provider.fetchEntity(firstId);
      expect(entity).toBeDefined();
      expect(entity!.id).toBe(firstId);
    });

    it("returns null for unknown ID", async () => {
      const provider = createProvider();
      const entity = await provider.fetchEntity("nonexistent-id");
      expect(entity).toBeNull();
    });
  });

  describe("getChangesSince", () => {
    it("reports all entities as created on first call", async () => {
      const provider = createProvider();
      const changes = await provider.getChangesSince(new Date(0));

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.every((c) => c.change_type === "created")).toBe(true);
    });

    it("reports no changes on second call with same data", async () => {
      const provider = createProvider();
      await provider.getChangesSince(new Date(0));

      const changes2 = await provider.getChangesSince(new Date(0));
      expect(changes2).toHaveLength(0);
    });
  });

  describe("mapToSudocode", () => {
    it("maps spec entities to Partial<Spec>", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();
      const spec = entities.find((e) => e.type === "spec")!;

      const mapped = provider.mapToSudocode(spec);
      expect(mapped.spec).toBeDefined();
      expect(mapped.spec!.title).toBe(spec.title);
    });

    it("maps issue entities to Partial<Issue>", async () => {
      const provider = createProvider();
      const entities = await provider.searchEntities();
      const issue = entities.find((e) => e.type === "issue")!;

      const mapped = provider.mapToSudocode(issue);
      expect(mapped.issue).toBeDefined();
      expect(mapped.issue!.title).toBe(issue.title);
    });
  });

  describe("createEntity", () => {
    it("throws — BMAD entities are created by BMAD workflows", async () => {
      const provider = createProvider();
      await expect(provider.createEntity({})).rejects.toThrow(
        "createEntity not supported",
      );
    });
  });
});
