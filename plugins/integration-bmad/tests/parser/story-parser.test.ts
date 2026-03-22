import { describe, it, expect } from "vitest";
import * as path from "path";
import {
  parseStoryFile,
  scanAndParseStories,
} from "../../src/parser/story-parser.js";

const FIXTURES = path.join(__dirname, "..", "fixtures");

describe("story-parser", () => {
  describe("parseStoryFile", () => {
    it("extracts epic and story numbers from title", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      expect(result.epicNumber).toBe(1);
      expect(result.storyNumber).toBe(1);
      expect(result.title).toBe("User Registration");
    });

    it("extracts slug from filename", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      expect(result.slug).toBe("1-1-user-registration");
    });

    it("extracts status", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );
      expect(result.status).toBe("ready-for-dev");

      const result2 = parseStoryFile(
        path.join(FIXTURES, "story-2-1-add-plant.md"),
      );
      expect(result2.status).toBe("in-progress");
    });

    it("extracts acceptance criteria in Given/When/Then format", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      expect(result.acceptanceCriteria.length).toBeGreaterThanOrEqual(1);

      const ac1 = result.acceptanceCriteria[0];
      expect(ac1.id).toBe("AC-1");
      expect(ac1.given).toContain("valid email");
      expect(ac1.when).toContain("submits the registration form");
      expect(ac1.then).toContain("account is created");
    });

    it("parses multiple acceptance criteria", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      expect(result.acceptanceCriteria.length).toBe(2);
      expect(result.acceptanceCriteria[1].given).toContain("already registered");
    });

    it("extracts tasks with completion status", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      expect(result.tasks.length).toBeGreaterThanOrEqual(2);

      // First task: incomplete with subtasks
      const task1 = result.tasks[0];
      expect(task1.completed).toBe(false);
      expect(task1.title).toContain("registration API endpoint");
      expect(task1.subtasks).toBeDefined();
      expect(task1.subtasks!.length).toBe(2);

      // Last task: completed
      const lastTask = result.tasks[result.tasks.length - 1];
      expect(lastTask.completed).toBe(true);
      expect(lastTask.title).toContain("email service");
    });

    it("handles subtask nesting correctly", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      // "Build registration form UI" has subtasks, one completed
      const formTask = result.tasks.find((t) =>
        t.title.includes("registration form UI"),
      );
      expect(formTask).toBeDefined();
      expect(formTask!.subtasks).toBeDefined();

      const designSubtask = formTask!.subtasks!.find((s) =>
        s.title.includes("Design form layout"),
      );
      expect(designSubtask).toBeDefined();
      expect(designSubtask!.completed).toBe(true);
    });

    it("extracts story content from Story section", () => {
      const result = parseStoryFile(
        path.join(FIXTURES, "story-1-1-user-registration.md"),
      );

      expect(result.content).toContain("As a new user");
      expect(result.content).toContain("save my plant collection");
    });
  });

  describe("scanAndParseStories", () => {
    it("scans directory for story files", () => {
      const result = scanAndParseStories(FIXTURES);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("sorts stories by epic then story number", () => {
      const result = scanAndParseStories(FIXTURES);

      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        if (prev.epicNumber === curr.epicNumber) {
          expect(curr.storyNumber).toBeGreaterThan(prev.storyNumber);
        } else {
          expect(curr.epicNumber).toBeGreaterThan(prev.epicNumber);
        }
      }
    });

    it("returns empty array for non-existent directory", () => {
      expect(scanAndParseStories("/nonexistent")).toEqual([]);
    });
  });
});
