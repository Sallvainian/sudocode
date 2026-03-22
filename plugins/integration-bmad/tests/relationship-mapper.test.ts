import { describe, it, expect } from "vitest";
import {
  mapProjectRelationships,
  mapEpicToPrd,
  mapStoryToEpic,
  mapArchToPrd,
  mapUxToPrd,
  mapStoryDependencies,
} from "../src/relationship-mapper.js";
import type { ParsedArtifact, ParsedEpic } from "../src/types.js";

// =============================================================================
// Fixtures
// =============================================================================

function makeArtifact(type: ParsedArtifact["type"]): ParsedArtifact {
  return {
    type,
    title: `${type} artifact`,
    content: `Content for ${type}`,
    filePath: `_bmad-output/${type}.md`,
    frontmatter: {},
    sections: [],
  };
}

function makeEpic(
  number: number,
  stories: Array<{ number: number; title: string; dependsOn?: number[] }> = [],
): ParsedEpic {
  return {
    number,
    title: `Epic ${number}`,
    description: `Description for epic ${number}`,
    filePath: `_bmad-output/epics/epic-${number}.md`,
    stories: stories.map((s) => ({
      number: s.number,
      title: s.title,
      description: `Story ${s.number} description`,
      dependsOn: s.dependsOn,
    })),
  };
}

// =============================================================================
// mapProjectRelationships
// =============================================================================

describe("mapProjectRelationships", () => {
  it("creates architecture → PRD references relationship", () => {
    const artifacts = [makeArtifact("prd"), makeArtifact("architecture")];
    const rels = mapProjectRelationships(artifacts, []);

    const archRef = rels.find(
      (r) => r.fromId === "bm-arch" && r.targetId === "bm-prd",
    );
    expect(archRef).toBeDefined();
    expect(archRef!.relationshipType).toBe("references");
    expect(archRef!.fromType).toBe("spec");
    expect(archRef!.targetType).toBe("spec");
  });

  it("creates UX spec → PRD references relationship", () => {
    const artifacts = [makeArtifact("prd"), makeArtifact("ux-spec")];
    const rels = mapProjectRelationships(artifacts, []);

    const uxRef = rels.find(
      (r) => r.fromId === "bm-ux" && r.targetId === "bm-prd",
    );
    expect(uxRef).toBeDefined();
    expect(uxRef!.relationshipType).toBe("references");
  });

  it("creates epic → PRD implements relationship", () => {
    const artifacts = [makeArtifact("prd")];
    const epics = [makeEpic(1)];
    const rels = mapProjectRelationships(artifacts, epics);

    const epicImpl = rels.find(
      (r) => r.fromId === "bme-1" && r.targetId === "bm-prd",
    );
    expect(epicImpl).toBeDefined();
    expect(epicImpl!.relationshipType).toBe("implements");
    expect(epicImpl!.fromType).toBe("issue");
    expect(epicImpl!.targetType).toBe("spec");
  });

  it("creates story → epic implements relationship", () => {
    const epics = [
      makeEpic(1, [
        { number: 1, title: "Story 1" },
        { number: 2, title: "Story 2" },
      ]),
    ];
    const rels = mapProjectRelationships([], epics);

    const story1Impl = rels.find(
      (r) => r.fromId === "bms-1-1" && r.targetId === "bme-1",
    );
    const story2Impl = rels.find(
      (r) => r.fromId === "bms-1-2" && r.targetId === "bme-1",
    );
    expect(story1Impl).toBeDefined();
    expect(story1Impl!.relationshipType).toBe("implements");
    expect(story2Impl).toBeDefined();
  });

  it("builds full relationship graph for a complete project", () => {
    const artifacts = [
      makeArtifact("prd"),
      makeArtifact("architecture"),
      makeArtifact("ux-spec"),
    ];
    const epics = [
      makeEpic(1, [
        { number: 1, title: "Story 1.1" },
        { number: 2, title: "Story 1.2" },
      ]),
      makeEpic(2, [{ number: 1, title: "Story 2.1" }]),
    ];

    const rels = mapProjectRelationships(artifacts, epics);

    // arch → PRD, ux → PRD, epic1 → PRD, epic2 → PRD,
    // story1.1 → epic1, story1.2 → epic1, story2.1 → epic2
    expect(rels).toHaveLength(7);

    // All relationship types used
    const types = new Set(rels.map((r) => r.relationshipType));
    expect(types).toContain("references");
    expect(types).toContain("implements");
  });

  it("skips arch → PRD when PRD doesn't exist", () => {
    const artifacts = [makeArtifact("architecture")];
    const rels = mapProjectRelationships(artifacts, []);
    expect(rels).toHaveLength(0);
  });

  it("skips epic → PRD when PRD doesn't exist", () => {
    const epics = [makeEpic(1)];
    const rels = mapProjectRelationships([], epics);
    // Only story→epic relationships (0 stories here)
    expect(rels.filter((r) => r.targetId === "bm-prd")).toHaveLength(0);
  });

  it("uses custom prefixes", () => {
    const artifacts = [makeArtifact("prd")];
    const epics = [makeEpic(1, [{ number: 1, title: "S1" }])];

    const rels = mapProjectRelationships(artifacts, epics, {
      specPrefix: "sp",
      epicPrefix: "ep",
      storyPrefix: "st",
    });

    expect(rels.some((r) => r.fromId === "ep-1")).toBe(true);
    expect(rels.some((r) => r.targetId === "sp-prd")).toBe(true);
    expect(rels.some((r) => r.fromId === "st-1-1")).toBe(true);
  });
});

// =============================================================================
// Individual Relationship Helpers
// =============================================================================

describe("mapEpicToPrd", () => {
  it("creates implements relationship", () => {
    const rel = mapEpicToPrd(1);
    expect(rel.fromId).toBe("bme-1");
    expect(rel.targetId).toBe("bm-prd");
    expect(rel.relationshipType).toBe("implements");
    expect(rel.fromType).toBe("issue");
    expect(rel.targetType).toBe("spec");
  });

  it("uses custom prefixes", () => {
    const rel = mapEpicToPrd(3, "sp", "ep");
    expect(rel.fromId).toBe("ep-3");
    expect(rel.targetId).toBe("sp-prd");
  });
});

describe("mapStoryToEpic", () => {
  it("creates implements relationship", () => {
    const rel = mapStoryToEpic(1, 3);
    expect(rel.fromId).toBe("bms-1-3");
    expect(rel.targetId).toBe("bme-1");
    expect(rel.relationshipType).toBe("implements");
    expect(rel.fromType).toBe("issue");
    expect(rel.targetType).toBe("issue");
  });

  it("uses custom prefixes", () => {
    const rel = mapStoryToEpic(2, 1, "ep", "st");
    expect(rel.fromId).toBe("st-2-1");
    expect(rel.targetId).toBe("ep-2");
  });
});

describe("mapArchToPrd", () => {
  it("creates references relationship", () => {
    const rel = mapArchToPrd();
    expect(rel.fromId).toBe("bm-arch");
    expect(rel.targetId).toBe("bm-prd");
    expect(rel.relationshipType).toBe("references");
  });
});

describe("mapUxToPrd", () => {
  it("creates references relationship", () => {
    const rel = mapUxToPrd();
    expect(rel.fromId).toBe("bm-ux");
    expect(rel.targetId).toBe("bm-prd");
    expect(rel.relationshipType).toBe("references");
  });
});

// =============================================================================
// mapStoryDependencies
// =============================================================================

describe("mapStoryDependencies", () => {
  it("creates depends-on relationships from story dependencies", () => {
    const epic = makeEpic(1, [
      { number: 1, title: "Story 1" },
      { number: 2, title: "Story 2", dependsOn: [1] },
      { number: 3, title: "Story 3", dependsOn: [1, 2] },
    ]);

    const rels = mapStoryDependencies(epic);

    // Story 2 depends on Story 1
    const dep1 = rels.find(
      (r) => r.fromId === "bms-1-2" && r.targetId === "bms-1-1",
    );
    expect(dep1).toBeDefined();
    expect(dep1!.relationshipType).toBe("depends-on");
    expect(dep1!.fromType).toBe("issue");
    expect(dep1!.targetType).toBe("issue");

    // Story 3 depends on Story 1 and Story 2
    const dep2 = rels.find(
      (r) => r.fromId === "bms-1-3" && r.targetId === "bms-1-1",
    );
    const dep3 = rels.find(
      (r) => r.fromId === "bms-1-3" && r.targetId === "bms-1-2",
    );
    expect(dep2).toBeDefined();
    expect(dep3).toBeDefined();

    expect(rels).toHaveLength(3);
  });

  it("returns empty array when no dependencies", () => {
    const epic = makeEpic(1, [
      { number: 1, title: "Story 1" },
      { number: 2, title: "Story 2" },
    ]);

    const rels = mapStoryDependencies(epic);
    expect(rels).toHaveLength(0);
  });

  it("uses custom prefixes", () => {
    const epic = makeEpic(1, [
      { number: 1, title: "Story 1" },
      { number: 2, title: "Story 2", dependsOn: [1] },
    ]);

    const rels = mapStoryDependencies(epic, "ep", "st");
    expect(rels[0].fromId).toBe("st-1-2");
    expect(rels[0].targetId).toBe("st-1-1");
  });
});
