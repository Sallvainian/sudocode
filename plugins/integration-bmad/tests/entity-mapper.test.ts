import { describe, it, expect } from "vitest";
import {
  mapToSudocode,
  mapFromSudocode,
  mapStoryStatus,
  mapEpicStatus,
  reverseMapStoryStatus,
  reverseMapEpicStatus,
  artifactToExternalEntity,
  epicToExternalEntity,
  storyToExternalEntity,
  applySprintStatus,
} from "../src/entity-mapper.js";
import type {
  ParsedArtifact,
  ParsedEpic,
  ParsedStory,
  ParsedSprintStatus,
} from "../src/types.js";

// =============================================================================
// Fixtures
// =============================================================================

function makePrdArtifact(overrides: Partial<ParsedArtifact> = {}): ParsedArtifact {
  return {
    type: "prd",
    title: "Product Requirements Document",
    content: "# PRD\n\nThis is the PRD content.",
    filePath: "_bmad-output/PRD.md",
    frontmatter: { status: "approved" },
    sections: [
      { heading: "PRD", level: 1, content: "This is the PRD content.", startLine: 1 },
    ],
    ...overrides,
  };
}

function makeEpic(overrides: Partial<ParsedEpic> = {}): ParsedEpic {
  return {
    number: 1,
    title: "Core Infrastructure",
    description: "Set up the core infrastructure for the project.",
    filePath: "_bmad-output/epics/epic-1.md",
    stories: [
      { number: 1, title: "Database setup", description: "Set up PostgreSQL" },
      { number: 2, title: "API scaffold", description: "Create Express app" },
    ],
    status: "in-progress",
    ...overrides,
  };
}

function makeStory(overrides: Partial<ParsedStory> = {}): ParsedStory {
  return {
    epicNumber: 1,
    storyNumber: 1,
    title: "Database setup",
    slug: "database-setup",
    content: "Set up PostgreSQL database with migrations.",
    filePath: "_bmad-output/stories/story-database-setup.md",
    frontmatter: { status: "in-progress" },
    acceptanceCriteria: [
      {
        id: "AC1",
        given: "a fresh environment",
        when: "running migrations",
        then: "the database schema is created",
      },
    ],
    tasks: [
      { id: "T1", title: "Install PostgreSQL", completed: true },
      {
        id: "T2",
        title: "Create schema",
        completed: false,
        subtasks: [
          { id: "T2.1", title: "Users table", completed: false },
        ],
      },
    ],
    status: "in-progress",
    ...overrides,
  };
}

// =============================================================================
// Status Mapping
// =============================================================================

describe("mapStoryStatus", () => {
  it("maps all BMAD story statuses correctly", () => {
    expect(mapStoryStatus("backlog")).toBe("open");
    expect(mapStoryStatus("ready-for-dev")).toBe("open");
    expect(mapStoryStatus("in-progress")).toBe("in_progress");
    expect(mapStoryStatus("review")).toBe("needs_review");
    expect(mapStoryStatus("done")).toBe("closed");
  });

  it("defaults to open for undefined", () => {
    expect(mapStoryStatus(undefined)).toBe("open");
  });
});

describe("mapEpicStatus", () => {
  it("maps all BMAD epic statuses correctly", () => {
    expect(mapEpicStatus("backlog")).toBe("open");
    expect(mapEpicStatus("in-progress")).toBe("in_progress");
    expect(mapEpicStatus("done")).toBe("closed");
  });

  it("defaults to open for undefined", () => {
    expect(mapEpicStatus(undefined)).toBe("open");
  });
});

describe("reverseMapStoryStatus", () => {
  it("maps sudocode statuses back to BMAD story statuses", () => {
    expect(reverseMapStoryStatus("open")).toBe("ready-for-dev");
    expect(reverseMapStoryStatus("in_progress")).toBe("in-progress");
    expect(reverseMapStoryStatus("blocked")).toBe("in-progress");
    expect(reverseMapStoryStatus("needs_review")).toBe("review");
    expect(reverseMapStoryStatus("closed")).toBe("done");
  });
});

describe("reverseMapEpicStatus", () => {
  it("maps sudocode statuses back to BMAD epic statuses", () => {
    expect(reverseMapEpicStatus("open")).toBe("backlog");
    expect(reverseMapEpicStatus("in_progress")).toBe("in-progress");
    expect(reverseMapEpicStatus("closed")).toBe("done");
  });
});

// =============================================================================
// BMAD → ExternalEntity
// =============================================================================

describe("artifactToExternalEntity", () => {
  it("converts a PRD artifact to a spec ExternalEntity", () => {
    const artifact = makePrdArtifact();
    const entity = artifactToExternalEntity(artifact, "bm-prd");

    expect(entity.id).toBe("bm-prd");
    expect(entity.type).toBe("spec");
    expect(entity.title).toBe("Product Requirements Document");
    expect(entity.description).toContain("PRD content");
    expect(entity.priority).toBe(2);
    expect((entity.raw as Record<string, unknown>).artifactType).toBe("prd");
    expect((entity.raw as Record<string, unknown>).filePath).toBe("_bmad-output/PRD.md");
  });

  it("converts different artifact types", () => {
    const arch = makePrdArtifact({ type: "architecture", title: "Architecture" });
    const entity = artifactToExternalEntity(arch, "bm-arch");
    expect(entity.type).toBe("spec");
    expect(entity.title).toBe("Architecture");
    expect((entity.raw as Record<string, unknown>).artifactType).toBe("architecture");
  });
});

describe("epicToExternalEntity", () => {
  it("converts an epic to an issue ExternalEntity", () => {
    const epic = makeEpic();
    const entity = epicToExternalEntity(epic, "bme-1");

    expect(entity.id).toBe("bme-1");
    expect(entity.type).toBe("issue");
    expect(entity.title).toBe("Core Infrastructure");
    expect(entity.status).toBe("in_progress"); // mapped from "in-progress"
    expect((entity.raw as Record<string, unknown>).entityKind).toBe("epic");
    expect((entity.raw as Record<string, unknown>).epicNumber).toBe(1);
  });

  it("creates implements relationship to PRD when prdSpecId provided", () => {
    const epic = makeEpic();
    const entity = epicToExternalEntity(epic, "bme-1", "bm-prd");

    expect(entity.relationships).toHaveLength(1);
    expect(entity.relationships![0]).toEqual({
      targetId: "bm-prd",
      targetType: "spec",
      relationshipType: "implements",
    });
  });

  it("has no relationships when prdSpecId not provided", () => {
    const epic = makeEpic();
    const entity = epicToExternalEntity(epic, "bme-1");
    expect(entity.relationships).toBeUndefined();
  });

  it("defaults to open status when epic has no status", () => {
    const epic = makeEpic({ status: undefined });
    const entity = epicToExternalEntity(epic, "bme-1");
    expect(entity.status).toBe("open");
  });
});

describe("storyToExternalEntity", () => {
  it("converts a story to an issue ExternalEntity", () => {
    const story = makeStory();
    const entity = storyToExternalEntity(story, "bms-1-1", "bme-1");

    expect(entity.id).toBe("bms-1-1");
    expect(entity.type).toBe("issue");
    expect(entity.title).toBe("Database setup");
    expect(entity.status).toBe("in_progress");
  });

  it("creates implements relationship to parent epic", () => {
    const story = makeStory();
    const entity = storyToExternalEntity(story, "bms-1-1", "bme-1");

    expect(entity.relationships).toHaveLength(1);
    expect(entity.relationships![0]).toEqual({
      targetId: "bme-1",
      targetType: "issue",
      relationshipType: "implements",
    });
  });

  it("includes acceptance criteria in description", () => {
    const story = makeStory();
    const entity = storyToExternalEntity(story, "bms-1-1", "bme-1");

    expect(entity.description).toContain("Acceptance Criteria");
    expect(entity.description).toContain("**Given** a fresh environment");
    expect(entity.description).toContain("**When** running migrations");
    expect(entity.description).toContain("**Then** the database schema is created");
  });

  it("includes tasks in description", () => {
    const story = makeStory();
    const entity = storyToExternalEntity(story, "bms-1-1", "bme-1");

    expect(entity.description).toContain("## Tasks");
    expect(entity.description).toContain("[x] Install PostgreSQL");
    expect(entity.description).toContain("[ ] Create schema");
    expect(entity.description).toContain("[ ] Users table");
  });

  it("stores story metadata in raw", () => {
    const story = makeStory();
    const entity = storyToExternalEntity(story, "bms-1-1", "bme-1");
    const raw = entity.raw as Record<string, unknown>;

    expect(raw.entityKind).toBe("story");
    expect(raw.epicNumber).toBe(1);
    expect(raw.storyNumber).toBe(1);
    expect(raw.slug).toBe("database-setup");
  });
});

// =============================================================================
// mapToSudocode
// =============================================================================

describe("mapToSudocode", () => {
  it("maps spec entities to sudocode specs", () => {
    const artifact = makePrdArtifact();
    const external = artifactToExternalEntity(artifact, "bm-prd");
    const result = mapToSudocode(external);

    expect(result.spec).toBeDefined();
    expect(result.issue).toBeUndefined();
    expect(result.spec!.title).toBe("Product Requirements Document");
    expect(result.spec!.content).toContain("PRD content");
    expect(result.spec!.priority).toBe(2);
  });

  it("maps issue entities to sudocode issues", () => {
    const epic = makeEpic();
    const external = epicToExternalEntity(epic, "bme-1", "bm-prd");
    const result = mapToSudocode(external);

    expect(result.issue).toBeDefined();
    expect(result.spec).toBeUndefined();
    expect(result.issue!.title).toBe("Core Infrastructure");
    expect(result.issue!.status).toBe("in_progress");
  });

  it("passes through relationships", () => {
    const epic = makeEpic();
    const external = epicToExternalEntity(epic, "bme-1", "bm-prd");
    const result = mapToSudocode(external);

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships![0].targetId).toBe("bm-prd");
  });
});

// =============================================================================
// mapFromSudocode
// =============================================================================

describe("mapFromSudocode", () => {
  it("maps a sudocode spec to external format", () => {
    const spec = {
      id: "bm-prd",
      uuid: "test-uuid",
      title: "PRD",
      content: "PRD content",
      priority: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const result = mapFromSudocode(spec);

    expect(result.type).toBe("spec");
    expect(result.title).toBe("PRD");
    expect(result.description).toBe("PRD content");
    expect(result.priority).toBe(2);
  });

  it("maps a sudocode issue to external format with status", () => {
    const issue = {
      id: "bme-1",
      uuid: "test-uuid",
      title: "Epic 1",
      content: "Epic content",
      priority: 2,
      status: "in_progress" as const,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const result = mapFromSudocode(issue);

    expect(result.type).toBe("issue");
    expect(result.status).toBe("in_progress");
  });
});

// =============================================================================
// applySprintStatus
// =============================================================================

describe("applySprintStatus", () => {
  it("updates entity statuses from sprint data", () => {
    const epic = makeEpic({ status: "backlog" });
    const epicEntity = epicToExternalEntity(epic, "bme-1");

    const story = makeStory({ status: "backlog" });
    const storyEntity = storyToExternalEntity(story, "bms-1-1", "bme-1");

    const entities = [epicEntity, storyEntity];

    const sprintStatus: ParsedSprintStatus = {
      currentSprint: 1,
      epics: [
        {
          epicNumber: 1,
          title: "Core Infrastructure",
          status: "in-progress",
          stories: [
            { key: "database-setup", title: "Database setup", status: "done" },
          ],
        },
      ],
    };

    applySprintStatus(entities, sprintStatus, { path: "_bmad-output" });

    expect(epicEntity.status).toBe("in_progress");
    expect(storyEntity.status).toBe("closed");
  });

  it("handles missing entities gracefully", () => {
    const entities: ReturnType<typeof epicToExternalEntity>[] = [];
    const sprintStatus: ParsedSprintStatus = {
      currentSprint: 1,
      epics: [
        {
          epicNumber: 99,
          title: "Nonexistent",
          status: "done",
          stories: [],
        },
      ],
    };

    // Should not throw
    expect(() =>
      applySprintStatus(entities, sprintStatus, { path: "_bmad-output" }),
    ).not.toThrow();
  });
});
