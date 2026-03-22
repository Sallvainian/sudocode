import { describe, it, expect } from "vitest";
import {
  generateSpecId,
  generateEpicId,
  generateStoryId,
  parseBmadId,
  isBmadId,
  createIdGenerators,
  DEFAULT_SPEC_PREFIX,
  DEFAULT_EPIC_PREFIX,
  DEFAULT_STORY_PREFIX,
} from "../src/id-generator.js";

// =============================================================================
// generateSpecId
// =============================================================================

describe("generateSpecId", () => {
  it("generates correct IDs for all artifact types", () => {
    expect(generateSpecId("prd")).toBe("bm-prd");
    expect(generateSpecId("architecture")).toBe("bm-arch");
    expect(generateSpecId("ux-spec")).toBe("bm-ux");
    expect(generateSpecId("product-brief")).toBe("bm-brief");
    expect(generateSpecId("project-context")).toBe("bm-ctx");
  });

  it("is deterministic — same input always produces same output", () => {
    const id1 = generateSpecId("prd");
    const id2 = generateSpecId("prd");
    const id3 = generateSpecId("prd");
    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  it("uses custom prefix", () => {
    expect(generateSpecId("prd", "spec")).toBe("spec-prd");
    expect(generateSpecId("architecture", "x")).toBe("x-arch");
  });

  it("normalizes input case and whitespace", () => {
    expect(generateSpecId("PRD")).toBe("bm-prd");
    expect(generateSpecId("  prd  ")).toBe("bm-prd");
    expect(generateSpecId("Architecture")).toBe("bm-arch");
  });

  it("throws for unknown artifact types", () => {
    expect(() => generateSpecId("unknown")).toThrow("Unknown BMAD artifact type");
    expect(() => generateSpecId("")).toThrow();
  });
});

// =============================================================================
// generateEpicId
// =============================================================================

describe("generateEpicId", () => {
  it("generates correct IDs from epic numbers", () => {
    expect(generateEpicId(1)).toBe("bme-1");
    expect(generateEpicId(2)).toBe("bme-2");
    expect(generateEpicId(10)).toBe("bme-10");
  });

  it("is deterministic", () => {
    expect(generateEpicId(5)).toBe(generateEpicId(5));
  });

  it("uses custom prefix", () => {
    expect(generateEpicId(1, "ep")).toBe("ep-1");
    expect(generateEpicId(3, "epic")).toBe("epic-3");
  });

  it("throws for invalid epic numbers", () => {
    expect(() => generateEpicId(0)).toThrow("positive integer");
    expect(() => generateEpicId(-1)).toThrow("positive integer");
    expect(() => generateEpicId(1.5)).toThrow("positive integer");
  });
});

// =============================================================================
// generateStoryId
// =============================================================================

describe("generateStoryId", () => {
  it("generates correct IDs from epic and story numbers", () => {
    expect(generateStoryId(1, 1)).toBe("bms-1-1");
    expect(generateStoryId(1, 3)).toBe("bms-1-3");
    expect(generateStoryId(2, 5)).toBe("bms-2-5");
  });

  it("is deterministic", () => {
    expect(generateStoryId(1, 3)).toBe(generateStoryId(1, 3));
  });

  it("uses custom prefix", () => {
    expect(generateStoryId(1, 3, "st")).toBe("st-1-3");
  });

  it("produces unique IDs for different stories", () => {
    const ids = new Set([
      generateStoryId(1, 1),
      generateStoryId(1, 2),
      generateStoryId(2, 1),
      generateStoryId(2, 2),
    ]);
    expect(ids.size).toBe(4);
  });

  it("throws for invalid numbers", () => {
    expect(() => generateStoryId(0, 1)).toThrow("Epic number");
    expect(() => generateStoryId(1, 0)).toThrow("Story number");
    expect(() => generateStoryId(-1, 1)).toThrow();
    expect(() => generateStoryId(1, -1)).toThrow();
  });
});

// =============================================================================
// parseBmadId
// =============================================================================

describe("parseBmadId", () => {
  it("parses spec IDs", () => {
    const result = parseBmadId("bm-prd");
    expect(result).toEqual({
      type: "spec",
      prefix: "bm",
      artifactSuffix: "prd",
    });
  });

  it("parses all spec ID suffixes", () => {
    for (const suffix of ["prd", "arch", "ux", "brief", "ctx"]) {
      const result = parseBmadId(`bm-${suffix}`);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("spec");
      expect(result!.artifactSuffix).toBe(suffix);
    }
  });

  it("parses epic IDs", () => {
    const result = parseBmadId("bme-1");
    expect(result).toEqual({
      type: "epic",
      prefix: "bme",
      epicNumber: 1,
    });
  });

  it("parses story IDs", () => {
    const result = parseBmadId("bms-1-3");
    expect(result).toEqual({
      type: "story",
      prefix: "bms",
      epicNumber: 1,
      storyNumber: 3,
    });
  });

  it("parses IDs with custom prefixes", () => {
    const options = { spec_prefix: "sp", epic_prefix: "ep", story_prefix: "st" };
    expect(parseBmadId("sp-prd", options)?.type).toBe("spec");
    expect(parseBmadId("ep-1", options)?.type).toBe("epic");
    expect(parseBmadId("st-2-3", options)?.type).toBe("story");
  });

  it("returns null for non-BMAD IDs", () => {
    expect(parseBmadId("s-abcd")).toBeNull();
    expect(parseBmadId("i-abcd")).toBeNull();
    expect(parseBmadId("invalid")).toBeNull();
    expect(parseBmadId("")).toBeNull();
  });

  it("roundtrips with generators", () => {
    // Spec roundtrip
    const specId = generateSpecId("prd");
    const parsedSpec = parseBmadId(specId);
    expect(parsedSpec?.type).toBe("spec");
    expect(parsedSpec?.artifactSuffix).toBe("prd");

    // Epic roundtrip
    const epicId = generateEpicId(3);
    const parsedEpic = parseBmadId(epicId);
    expect(parsedEpic?.type).toBe("epic");
    expect(parsedEpic?.epicNumber).toBe(3);

    // Story roundtrip
    const storyId = generateStoryId(2, 5);
    const parsedStory = parseBmadId(storyId);
    expect(parsedStory?.type).toBe("story");
    expect(parsedStory?.epicNumber).toBe(2);
    expect(parsedStory?.storyNumber).toBe(5);
  });
});

// =============================================================================
// isBmadId
// =============================================================================

describe("isBmadId", () => {
  it("returns true for valid BMAD IDs", () => {
    expect(isBmadId("bm-prd")).toBe(true);
    expect(isBmadId("bme-1")).toBe(true);
    expect(isBmadId("bms-1-3")).toBe(true);
  });

  it("returns false for non-BMAD IDs", () => {
    expect(isBmadId("s-abcd")).toBe(false);
    expect(isBmadId("os-1234")).toBe(false);
    expect(isBmadId("")).toBe(false);
    expect(isBmadId("random")).toBe(false);
  });

  it("works with custom prefixes", () => {
    const options = { spec_prefix: "sp", epic_prefix: "ep", story_prefix: "st" };
    expect(isBmadId("sp-prd", options)).toBe(true);
    expect(isBmadId("bm-prd", options)).toBe(false); // wrong prefix
  });
});

// =============================================================================
// createIdGenerators (factory)
// =============================================================================

describe("createIdGenerators", () => {
  it("creates generators with default prefixes", () => {
    const ids = createIdGenerators();
    expect(ids.specId("prd")).toBe("bm-prd");
    expect(ids.epicId(1)).toBe("bme-1");
    expect(ids.storyId(1, 3)).toBe("bms-1-3");
  });

  it("creates generators with custom prefixes", () => {
    const ids = createIdGenerators({
      spec_prefix: "sp",
      epic_prefix: "ep",
      story_prefix: "st",
    });
    expect(ids.specId("prd")).toBe("sp-prd");
    expect(ids.epicId(1)).toBe("ep-1");
    expect(ids.storyId(1, 3)).toBe("st-1-3");
  });

  it("parse and isBmadId use configured prefixes", () => {
    const ids = createIdGenerators({ epic_prefix: "ep" });
    expect(ids.parse("ep-5")?.epicNumber).toBe(5);
    expect(ids.isBmadId("ep-5")).toBe(true);
    expect(ids.isBmadId("bme-5")).toBe(false);
  });
});

// =============================================================================
// Default prefix constants
// =============================================================================

describe("default prefixes", () => {
  it("exports correct defaults", () => {
    expect(DEFAULT_SPEC_PREFIX).toBe("bm");
    expect(DEFAULT_EPIC_PREFIX).toBe("bme");
    expect(DEFAULT_STORY_PREFIX).toBe("bms");
  });
});
