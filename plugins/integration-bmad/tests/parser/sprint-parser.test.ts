import { describe, it, expect } from "vitest";
import * as path from "path";
import {
  parseSprintStatus,
  parseSprintStatusContent,
} from "../../src/parser/sprint-parser.js";

const FIXTURES = path.join(__dirname, "..", "fixtures");

describe("sprint-parser", () => {
  describe("parseSprintStatus", () => {
    it("parses sprint-status.yaml from file", () => {
      const result = parseSprintStatus(
        path.join(FIXTURES, "sprint-status.yaml"),
      );

      expect(result.epics.length).toBe(2);
    });

    it("extracts epic numbers and statuses", () => {
      const result = parseSprintStatus(
        path.join(FIXTURES, "sprint-status.yaml"),
      );

      expect(result.epics[0].epicNumber).toBe(1);
      expect(result.epics[0].status).toBe("in-progress");
      expect(result.epics[1].epicNumber).toBe(2);
      expect(result.epics[1].status).toBe("backlog");
    });

    it("extracts stories under their epics", () => {
      const result = parseSprintStatus(
        path.join(FIXTURES, "sprint-status.yaml"),
      );

      const epic1 = result.epics[0];
      expect(epic1.stories.length).toBe(3);

      const registration = epic1.stories.find((s) =>
        s.key.includes("registration"),
      );
      expect(registration).toBeDefined();
      expect(registration!.status).toBe("done");

      const login = epic1.stories.find((s) => s.key.includes("login"));
      expect(login).toBeDefined();
      expect(login!.status).toBe("ready-for-dev");

      const profile = epic1.stories.find((s) =>
        s.key.includes("profile"),
      );
      expect(profile).toBeDefined();
      expect(profile!.status).toBe("backlog");
    });

    it("extracts epic-2 stories", () => {
      const result = parseSprintStatus(
        path.join(FIXTURES, "sprint-status.yaml"),
      );

      const epic2 = result.epics[1];
      expect(epic2.stories.length).toBe(2);

      const addPlant = epic2.stories.find((s) => s.key.includes("add-plant"));
      expect(addPlant).toBeDefined();
      expect(addPlant!.status).toBe("in-progress");
    });

    it("captures retrospective entries", () => {
      const result = parseSprintStatus(
        path.join(FIXTURES, "sprint-status.yaml"),
      );

      expect(result.epics[0].retrospective).toBeDefined();
      expect(result.epics[0].retrospective!.status).toBe("optional");
    });
  });

  describe("parseSprintStatusContent", () => {
    it("returns empty epics for empty content", () => {
      const result = parseSprintStatusContent("");
      expect(result.epics).toEqual([]);
    });

    it("returns empty epics for content without development_status", () => {
      const result = parseSprintStatusContent("project: Test\n");
      expect(result.epics).toEqual([]);
    });

    it("normalizes legacy 'contexted' status to 'in-progress'", () => {
      const content = `
development_status:
  epic-1: contexted
  1-1-auth: ready
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].status).toBe("in-progress");
    });

    it("normalizes 'completed' to 'done'", () => {
      const content = `
development_status:
  epic-1: completed
  1-1-auth: completed
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].status).toBe("done");
      expect(result.epics[0].stories[0].status).toBe("done");
    });

    it("normalizes 'ready' to 'ready-for-dev'", () => {
      const content = `
development_status:
  epic-1: backlog
  1-1-auth: ready
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].stories[0].status).toBe("ready-for-dev");
    });

    it("normalizes 'in-review' to 'review'", () => {
      const content = `
development_status:
  epic-1: backlog
  1-1-auth: in-review
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].stories[0].status).toBe("review");
    });

    it("defaults unknown statuses to 'backlog'", () => {
      const content = `
development_status:
  epic-1: unknown-status
  1-1-auth: something-weird
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].status).toBe("backlog");
      expect(result.epics[0].stories[0].status).toBe("backlog");
    });

    it("creates epic for orphan stories", () => {
      const content = `
development_status:
  3-1-orphan-story: in-progress
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics.length).toBe(1);
      expect(result.epics[0].epicNumber).toBe(3);
      expect(result.epics[0].status).toBe("backlog");
      expect(result.epics[0].stories[0].status).toBe("in-progress");
    });

    it("sorts epics by number", () => {
      const content = `
development_status:
  epic-3: backlog
  epic-1: in-progress
  epic-2: done
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].epicNumber).toBe(1);
      expect(result.epics[1].epicNumber).toBe(2);
      expect(result.epics[2].epicNumber).toBe(3);
    });

    it("derives title from slug for stories", () => {
      const content = `
development_status:
  epic-1: backlog
  1-1-user-auth: done
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].stories[0].title).toBe("User Auth");
    });

    it("preserves story key", () => {
      const content = `
development_status:
  epic-1: backlog
  1-1-user-auth: done
`;
      const result = parseSprintStatusContent(content);

      expect(result.epics[0].stories[0].key).toBe("1-1-user-auth");
    });
  });
});
