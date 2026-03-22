import { describe, it, expect } from "vitest";
import * as path from "path";
import {
  parseEpicFile,
  parseCombinedEpicsFile,
  scanAndParseEpics,
} from "../../src/parser/epic-parser.js";

const FIXTURES = path.join(__dirname, "..", "fixtures");

describe("epic-parser", () => {
  describe("parseEpicFile (sharded)", () => {
    it("parses epic number and title", () => {
      const result = parseEpicFile(
        path.join(FIXTURES, "epics", "epic-1.md"),
      );

      expect(result.number).toBe(1);
      expect(result.title).toBe("User Authentication & Account Management");
    });

    it("extracts epic description", () => {
      const result = parseEpicFile(
        path.join(FIXTURES, "epics", "epic-1.md"),
      );

      expect(result.description).toContain(
        "Enable users to create accounts",
      );
    });

    it("extracts inline stories", () => {
      const result = parseEpicFile(
        path.join(FIXTURES, "epics", "epic-1.md"),
      );

      expect(result.stories).toHaveLength(3);
      expect(result.stories[0].number).toBe(1);
      expect(result.stories[0].title).toBe("User Registration");
      expect(result.stories[1].number).toBe(2);
      expect(result.stories[1].title).toBe("User Login");
      expect(result.stories[2].number).toBe(3);
      expect(result.stories[2].title).toBe("Profile Management");
    });

    it("extracts acceptance criteria from inline stories", () => {
      const result = parseEpicFile(
        path.join(FIXTURES, "epics", "epic-1.md"),
      );

      const registration = result.stories[0];
      expect(registration.acceptanceCriteria).toBeDefined();
      expect(registration.acceptanceCriteria!.length).toBeGreaterThan(0);
      expect(registration.acceptanceCriteria![0]).toContain("Given");
    });

    it("parses epic-2 with fewer stories", () => {
      const result = parseEpicFile(
        path.join(FIXTURES, "epics", "epic-2.md"),
      );

      expect(result.number).toBe(2);
      expect(result.title).toBe("Plant Management");
      expect(result.stories).toHaveLength(2);
      expect(result.stories[0].title).toBe("Add Plant Manually");
      expect(result.stories[1].title).toBe("Plant Identification");
    });
  });

  describe("parseCombinedEpicsFile", () => {
    it("parses multiple epics from a single file", () => {
      const result = parseCombinedEpicsFile(
        path.join(FIXTURES, "epics-combined.md"),
      );

      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[0].title).toBe("User Authentication");
      expect(result[0].stories).toHaveLength(2);
      expect(result[1].number).toBe(2);
      expect(result[1].title).toBe("Plant Management");
      expect(result[1].stories).toHaveLength(1);
    });
  });

  describe("scanAndParseEpics", () => {
    it("scans a directory of sharded epic files", () => {
      const result = scanAndParseEpics(path.join(FIXTURES, "epics"));

      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[1].number).toBe(2);
    });

    it("sorts epics by number", () => {
      const result = scanAndParseEpics(path.join(FIXTURES, "epics"));

      for (let i = 1; i < result.length; i++) {
        expect(result[i].number).toBeGreaterThan(result[i - 1].number);
      }
    });

    it("parses a combined file when passed directly", () => {
      const result = scanAndParseEpics(
        path.join(FIXTURES, "epics-combined.md"),
      );

      expect(result).toHaveLength(2);
    });

    it("returns empty array for non-existent directory", () => {
      const result = scanAndParseEpics(
        path.join(FIXTURES, "nonexistent"),
      );
      expect(result).toEqual([]);
    });
  });
});
