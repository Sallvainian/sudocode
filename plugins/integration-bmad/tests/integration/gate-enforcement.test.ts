/**
 * Gate Enforcement Integration Test
 *
 * Tests the BMAD quality gate enforcement service:
 * - FAIL: creates blocked issues + request feedback + blocks relationships
 * - CONCERNS: creates suggestion feedback
 * - PASS: creates informational comment feedback
 * - resolveGate: cleans up feedback, relationships, and unblocks issues
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, existsSync } from "fs";

import { initDatabase } from "@sudocode-ai/cli/dist/db.js";
import { createSpec } from "@sudocode-ai/cli/dist/operations/specs.js";
import { createIssue } from "@sudocode-ai/cli/dist/operations/issues.js";
import { addRelationship } from "@sudocode-ai/cli/dist/operations/relationships.js";
import { listFeedback } from "@sudocode-ai/cli/dist/operations/feedback.js";

import {
  applyGateResult,
  resolveGate,
  type ApplyGateInput,
} from "../../../../server/src/services/bmad-gate-service.js";

// =============================================================================
// Test Helpers
// =============================================================================

interface TestContext {
  db: Database.Database;
  testDir: string;
  cleanup: () => void;
}

function createTestDb(): TestContext {
  const testDir = join(
    tmpdir(),
    `bmad-gate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(testDir, { recursive: true });

  const dbPath = join(testDir, "cache.db");
  const db = initDatabase({ path: dbPath });

  return {
    db,
    testDir,
    cleanup: () => {
      db.close();
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    },
  };
}

function seedSpec(db: Database.Database, id: string, title: string): void {
  createSpec(db, {
    id,
    uuid: crypto.randomUUID(),
    title,
    file_path: `specs/${id}.md`,
    content: `Content for ${title}`,
  });
}

function seedIssue(
  db: Database.Database,
  id: string,
  title: string,
  status: string = "open",
): void {
  createIssue(db, {
    id,
    uuid: crypto.randomUUID(),
    title,
    content: `Content for ${title}`,
    status: status as any,
  });
}

function seedImplementsRelationship(
  db: Database.Database,
  issueId: string,
  specId: string,
): void {
  addRelationship(db, {
    from_id: issueId,
    from_type: "issue",
    to_id: specId,
    to_type: "spec",
    relationship_type: "implements",
  });
}

function getIssueStatus(db: Database.Database, issueId: string): string | undefined {
  const row = db
    .prepare("SELECT status FROM issues WHERE id = ?")
    .get(issueId) as { status: string } | undefined;
  return row?.status;
}

function getBlocksRelationships(db: Database.Database): Array<{
  from_id: string;
  to_id: string;
  metadata: string | null;
}> {
  return db
    .prepare("SELECT from_id, to_id, metadata FROM relationships WHERE relationship_type = 'blocks'")
    .all() as any[];
}

// =============================================================================
// Tests
// =============================================================================

describe("Gate Enforcement Integration", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  describe("FAIL result", () => {
    it("creates request-type feedback for each failed item", () => {
      seedSpec(ctx.db, "s-prd", "Product Requirements");

      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "fail",
        items: [
          { description: "Missing NFR section", specId: "s-prd" },
          { description: "No acceptance criteria", specId: "s-prd" },
        ],
      };

      const output = applyGateResult(ctx.db, input);

      expect(output.result).toBe("fail");
      expect(output.feedbackCreated.length).toBe(2);

      for (const fb of output.feedbackCreated) {
        expect(fb.feedback_type).toBe("request");
        expect(fb.content).toContain("FAIL");
        expect(fb.content).toContain("readiness");
        expect(fb.agent).toBe("bmad-gate:readiness");
      }
    });

    it("blocks dependent issues implementing the failing spec", () => {
      seedSpec(ctx.db, "s-prd", "Product Requirements");
      seedIssue(ctx.db, "i-epic1", "Epic 1", "open");
      seedIssue(ctx.db, "i-epic2", "Epic 2", "in_progress");
      seedImplementsRelationship(ctx.db, "i-epic1", "s-prd");
      seedImplementsRelationship(ctx.db, "i-epic2", "s-prd");

      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "fail",
        items: [{ description: "Critical issue found", specId: "s-prd" }],
      };

      const output = applyGateResult(ctx.db, input);

      // Both issues should be blocked
      expect(output.issuesBlocked).toContain("i-epic1");
      expect(output.issuesBlocked).toContain("i-epic2");

      // Issue statuses should be updated
      expect(getIssueStatus(ctx.db, "i-epic1")).toBe("blocked");
      expect(getIssueStatus(ctx.db, "i-epic2")).toBe("blocked");

      // blocks relationships should be created
      expect(output.relationshipsCreated).toBe(2);
      const blocks = getBlocksRelationships(ctx.db);
      expect(blocks.length).toBe(2);
    });

    it("blocks an issue directly when targeting issueId", () => {
      seedIssue(ctx.db, "i-story1", "Story 1", "open");

      const input: ApplyGateInput = {
        gateType: "story-validation",
        result: "fail",
        items: [{ description: "Story is incomplete", issueId: "i-story1" }],
      };

      const output = applyGateResult(ctx.db, input);

      expect(output.issuesBlocked).toContain("i-story1");
      expect(getIssueStatus(ctx.db, "i-story1")).toBe("blocked");
    });

    it("creates blocks relationships with gate metadata", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      seedIssue(ctx.db, "i-epic1", "Epic 1", "open");
      seedImplementsRelationship(ctx.db, "i-epic1", "s-prd");

      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "fail",
        items: [{ description: "Bad", specId: "s-prd" }],
      };

      applyGateResult(ctx.db, input);

      const blocks = getBlocksRelationships(ctx.db);
      expect(blocks.length).toBe(1);
      expect(blocks[0].from_id).toBe("s-prd");
      expect(blocks[0].to_id).toBe("i-epic1");

      const metadata = JSON.parse(blocks[0].metadata!);
      expect(metadata.gateType).toBe("readiness");
    });

    it("skips items without specId or issueId", () => {
      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "fail",
        items: [{ description: "Orphan item with no target" }],
      };

      const output = applyGateResult(ctx.db, input);
      expect(output.feedbackCreated.length).toBe(0);
      expect(output.issuesBlocked.length).toBe(0);
    });
  });

  describe("CONCERNS result", () => {
    it("creates suggestion-type feedback", () => {
      seedSpec(ctx.db, "s-arch", "Architecture");

      const input: ApplyGateInput = {
        gateType: "code-review",
        result: "concerns",
        items: [
          { description: "Consider adding caching layer", specId: "s-arch" },
          { description: "Error handling could be improved", specId: "s-arch" },
        ],
      };

      const output = applyGateResult(ctx.db, input);

      expect(output.result).toBe("concerns");
      expect(output.feedbackCreated.length).toBe(2);

      for (const fb of output.feedbackCreated) {
        expect(fb.feedback_type).toBe("suggestion");
        expect(fb.content).toContain("CONCERN");
        expect(fb.agent).toBe("bmad-gate:code-review");
      }
    });

    it("does NOT block any issues", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      seedIssue(ctx.db, "i-epic1", "Epic 1", "open");
      seedImplementsRelationship(ctx.db, "i-epic1", "s-prd");

      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "concerns",
        items: [{ description: "Minor concern", specId: "s-prd" }],
      };

      const output = applyGateResult(ctx.db, input);

      expect(output.issuesBlocked.length).toBe(0);
      expect(output.relationshipsCreated).toBe(0);
      expect(getIssueStatus(ctx.db, "i-epic1")).toBe("open");
    });
  });

  describe("PASS result", () => {
    it("creates comment-type feedback", () => {
      seedSpec(ctx.db, "s-prd", "PRD");

      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "pass",
        items: [{ description: "All requirements validated", specId: "s-prd" }],
      };

      const output = applyGateResult(ctx.db, input);

      expect(output.result).toBe("pass");
      expect(output.feedbackCreated.length).toBe(1);
      expect(output.feedbackCreated[0].feedback_type).toBe("comment");
      expect(output.feedbackCreated[0].content).toContain("PASS");
    });

    it("does NOT block any issues or create relationships", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      seedIssue(ctx.db, "i-epic1", "Epic 1", "open");
      seedImplementsRelationship(ctx.db, "i-epic1", "s-prd");

      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "pass",
        items: [{ description: "Looks good", specId: "s-prd" }],
      };

      const output = applyGateResult(ctx.db, input);

      expect(output.issuesBlocked.length).toBe(0);
      expect(output.relationshipsCreated).toBe(0);
      expect(getIssueStatus(ctx.db, "i-epic1")).toBe("open");
    });
  });

  describe("resolveGate", () => {
    it("dismisses all feedback from a specific gate type", () => {
      seedSpec(ctx.db, "s-prd", "PRD");

      // Apply a failing gate
      const input: ApplyGateInput = {
        gateType: "readiness",
        result: "fail",
        items: [
          { description: "Issue A", specId: "s-prd" },
          { description: "Issue B", specId: "s-prd" },
        ],
      };
      applyGateResult(ctx.db, input);

      // Verify feedback exists
      let feedback = listFeedback(ctx.db, { dismissed: false });
      const gateFeedback = feedback.filter((f) => f.agent === "bmad-gate:readiness");
      expect(gateFeedback.length).toBe(2);

      // Resolve the gate
      const resolveOutput = resolveGate(ctx.db, "readiness");
      expect(resolveOutput.feedbackDismissed).toBe(2);

      // Verify feedback is dismissed
      feedback = listFeedback(ctx.db, { dismissed: false });
      const remaining = feedback.filter((f) => f.agent === "bmad-gate:readiness");
      expect(remaining.length).toBe(0);
    });

    it("removes blocks relationships created by the gate", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      seedIssue(ctx.db, "i-epic1", "Epic 1", "open");
      seedImplementsRelationship(ctx.db, "i-epic1", "s-prd");

      // Apply a failing gate
      applyGateResult(ctx.db, {
        gateType: "readiness",
        result: "fail",
        items: [{ description: "Critical", specId: "s-prd" }],
      });

      // Verify blocks relationship exists
      let blocks = getBlocksRelationships(ctx.db);
      expect(blocks.length).toBe(1);

      // Resolve the gate
      const resolveOutput = resolveGate(ctx.db, "readiness");
      expect(resolveOutput.relationshipsRemoved).toBe(1);

      // Verify blocks relationship removed
      blocks = getBlocksRelationships(ctx.db);
      expect(blocks.length).toBe(0);
    });

    it("only resolves feedback/relationships for the specified gate type", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      seedSpec(ctx.db, "s-arch", "Architecture");

      // Apply two different gate types
      applyGateResult(ctx.db, {
        gateType: "readiness",
        result: "fail",
        items: [{ description: "Readiness issue", specId: "s-prd" }],
      });

      applyGateResult(ctx.db, {
        gateType: "code-review",
        result: "concerns",
        items: [{ description: "Code concern", specId: "s-arch" }],
      });

      // Resolve only readiness gate
      resolveGate(ctx.db, "readiness");

      // Readiness feedback should be dismissed
      const feedback = listFeedback(ctx.db, { dismissed: false });
      const readinessFb = feedback.filter((f) => f.agent === "bmad-gate:readiness");
      expect(readinessFb.length).toBe(0);

      // Code review feedback should remain
      const codereviewFb = feedback.filter((f) => f.agent === "bmad-gate:code-review");
      expect(codereviewFb.length).toBe(1);
    });

    it("handles resolve when no gate feedback exists", () => {
      const resolveOutput = resolveGate(ctx.db, "readiness");

      expect(resolveOutput.feedbackDismissed).toBe(0);
      expect(resolveOutput.issuesUnblocked.length).toBe(0);
      expect(resolveOutput.relationshipsRemoved).toBe(0);
    });
  });

  describe("Gate types", () => {
    it("supports readiness gate type", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      const output = applyGateResult(ctx.db, {
        gateType: "readiness",
        result: "pass",
        items: [{ description: "Ready", specId: "s-prd" }],
      });
      expect(output.feedbackCreated[0].agent).toBe("bmad-gate:readiness");
    });

    it("supports story-validation gate type", () => {
      seedIssue(ctx.db, "i-story1", "Story 1");
      const output = applyGateResult(ctx.db, {
        gateType: "story-validation",
        result: "pass",
        items: [{ description: "Valid", issueId: "i-story1" }],
      });
      expect(output.feedbackCreated[0].agent).toBe("bmad-gate:story-validation");
    });

    it("supports code-review gate type", () => {
      seedIssue(ctx.db, "i-story1", "Story 1");
      const output = applyGateResult(ctx.db, {
        gateType: "code-review",
        result: "pass",
        items: [{ description: "Clean", issueId: "i-story1" }],
      });
      expect(output.feedbackCreated[0].agent).toBe("bmad-gate:code-review");
    });
  });

  describe("Full gate lifecycle", () => {
    it("apply FAIL → verify blocked → resolve → verify unblocked", () => {
      seedSpec(ctx.db, "s-prd", "PRD");
      seedIssue(ctx.db, "i-epic1", "Epic 1", "open");
      seedImplementsRelationship(ctx.db, "i-epic1", "s-prd");

      // 1. Apply FAIL gate
      const failOutput = applyGateResult(ctx.db, {
        gateType: "readiness",
        result: "fail",
        items: [{ description: "PRD incomplete", specId: "s-prd" }],
      });

      // 2. Verify blocked state
      expect(failOutput.issuesBlocked).toContain("i-epic1");
      expect(failOutput.feedbackCreated.length).toBe(1);
      expect(failOutput.relationshipsCreated).toBe(1);
      expect(getIssueStatus(ctx.db, "i-epic1")).toBe("blocked");

      // 3. Resolve gate
      const resolveOutput = resolveGate(ctx.db, "readiness");

      // 4. Verify cleanup
      expect(resolveOutput.feedbackDismissed).toBe(1);
      expect(resolveOutput.relationshipsRemoved).toBe(1);

      // 5. Verify blocks relationship removed
      const blocks = getBlocksRelationships(ctx.db);
      expect(blocks.length).toBe(0);
    });
  });
});
