/**
 * BMAD Quality Gate Enforcement Service
 *
 * Applies quality gate results (PASS/CONCERNS/FAIL) by creating
 * feedback entries, blocking relationships, and status updates
 * on sudocode issues and specs.
 */

import type Database from "better-sqlite3";
import {
  createFeedback,
  updateFeedback,
  listFeedback,
  type CreateFeedbackInput,
} from "@sudocode-ai/cli/dist/operations/feedback.js";
import { updateIssue } from "@sudocode-ai/cli/dist/operations/issues.js";
import {
  addRelationship,
  removeRelationship,
} from "@sudocode-ai/cli/dist/operations/relationships.js";
import type { IssueFeedback, FeedbackAnchor } from "@sudocode-ai/types";

// =============================================================================
// Types
// =============================================================================

export type GateType = "readiness" | "story-validation" | "code-review";
export type GateResult = "pass" | "concerns" | "fail";

export interface GateItem {
  description: string;
  severity?: "critical" | "major" | "minor";
  specId?: string;
  issueId?: string;
  anchor?: FeedbackAnchor;
}

export interface ApplyGateInput {
  gateType: GateType;
  result: GateResult;
  items: GateItem[];
}

export interface ApplyGateOutput {
  result: GateResult;
  feedbackCreated: IssueFeedback[];
  issuesBlocked: string[];
  relationshipsCreated: number;
}

export interface ResolveGateOutput {
  feedbackDismissed: number;
  issuesUnblocked: string[];
  relationshipsRemoved: number;
}

// =============================================================================
// Gate Service
// =============================================================================

/**
 * Apply a BMAD quality gate result.
 *
 * - FAIL: Block dependent issues, create `blocks` relationships, create `request`-type feedback
 * - CONCERNS: Create `suggestion`-type feedback anchored to the relevant spec
 * - PASS: Create `comment`-type feedback (informational)
 */
export function applyGateResult(
  db: Database.Database,
  input: ApplyGateInput,
): ApplyGateOutput {
  const { gateType, result, items } = input;
  const feedbackCreated: IssueFeedback[] = [];
  const issuesBlocked: string[] = [];
  let relationshipsCreated = 0;

  const agent = `bmad-gate:${gateType}`;

  for (const item of items) {
    const targetId = item.specId || item.issueId;
    if (!targetId) continue;

    if (result === "fail") {
      // Create request-type feedback for each failed item
      const feedbackInput: CreateFeedbackInput = {
        to_id: targetId,
        feedback_type: "request",
        content: `[BMAD ${gateType} FAIL] ${item.description}`,
        agent,
        anchor: item.anchor,
      };
      const feedback = createFeedback(db, feedbackInput);
      feedbackCreated.push(feedback);

      // If targeting a spec, find and block dependent issues
      if (item.specId) {
        const dependentIssues = findIssuesImplementingSpec(db, item.specId);
        for (const issue of dependentIssues) {
          if (issue.status === "open" || issue.status === "in_progress") {
            try {
              addRelationship(db, {
                from_id: item.specId,
                from_type: "spec",
                to_id: issue.id,
                to_type: "issue",
                relationship_type: "blocks",
                metadata: JSON.stringify({ gateType, feedbackId: feedback.id }),
              });
              relationshipsCreated++;

              updateIssue(db, issue.id, { status: "blocked" });
              issuesBlocked.push(issue.id);
            } catch {
              // Relationship may already exist, skip
            }
          }
        }
      }

      // If targeting an issue directly, block it
      if (item.issueId) {
        try {
          updateIssue(db, item.issueId, { status: "blocked" });
          issuesBlocked.push(item.issueId);
        } catch {
          // Issue may not exist
        }
      }
    } else if (result === "concerns") {
      // Create suggestion-type feedback
      const feedbackInput: CreateFeedbackInput = {
        to_id: targetId,
        feedback_type: "suggestion",
        content: `[BMAD ${gateType} CONCERN] ${item.description}`,
        agent,
        anchor: item.anchor,
      };
      const feedback = createFeedback(db, feedbackInput);
      feedbackCreated.push(feedback);
    } else {
      // PASS: Create informational comment
      const feedbackInput: CreateFeedbackInput = {
        to_id: targetId,
        feedback_type: "comment",
        content: `[BMAD ${gateType} PASS] ${item.description}`,
        agent,
      };
      const feedback = createFeedback(db, feedbackInput);
      feedbackCreated.push(feedback);
    }
  }

  return {
    result,
    feedbackCreated,
    issuesBlocked: [...new Set(issuesBlocked)],
    relationshipsCreated,
  };
}

/**
 * Resolve a gate: dismiss feedback, remove blocked status, clean up relationships.
 *
 * Finds all feedback created by the given gate type and dismisses it,
 * then removes any blocks relationships that were created by the gate,
 * and unblocks affected issues.
 */
export function resolveGate(
  db: Database.Database,
  gateType: GateType,
): ResolveGateOutput {
  const agent = `bmad-gate:${gateType}`;
  let feedbackDismissed = 0;
  const issuesUnblocked: string[] = [];
  let relationshipsRemoved = 0;

  // Find all active feedback from this gate
  const allFeedback = listFeedback(db, { dismissed: false });
  const gateFeedback = allFeedback.filter(
    (f) => f.agent === agent,
  );

  // Dismiss each feedback entry
  for (const fb of gateFeedback) {
    updateFeedback(db, fb.id, { dismissed: true });
    feedbackDismissed++;
  }

  // Find and remove blocks relationships with gate metadata
  const blocksRelationships = db
    .prepare(
      `SELECT * FROM relationships
       WHERE relationship_type = 'blocks'
         AND metadata LIKE ?`,
    )
    .all(`%"gateType":"${gateType}"%`) as Array<{
    from_id: string;
    from_type: "spec" | "issue";
    to_id: string;
    to_type: "spec" | "issue";
    relationship_type: string;
  }>;

  for (const rel of blocksRelationships) {
    removeRelationship(
      db,
      rel.from_id,
      rel.from_type,
      rel.to_id,
      rel.to_type,
      "blocks",
    );
    relationshipsRemoved++;

    // Check if the previously blocked issue can be unblocked
    if (rel.to_type === "issue") {
      const issue = db
        .prepare(`SELECT id, status FROM issues WHERE id = ?`)
        .get(rel.to_id) as { id: string; status: string } | undefined;

      if (issue && issue.status === "blocked") {
        // The removeRelationship call already handles auto-unblocking
        // via autoUpdateBlockedStatusOnRemove, but let's track it
        const updated = db
          .prepare(`SELECT status FROM issues WHERE id = ?`)
          .get(rel.to_id) as { status: string } | undefined;
        if (updated && updated.status !== "blocked") {
          issuesUnblocked.push(rel.to_id);
        }
      }
    }
  }

  return {
    feedbackDismissed,
    issuesUnblocked: [...new Set(issuesUnblocked)],
    relationshipsRemoved,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find issues that implement a given spec via `implements` relationships.
 */
function findIssuesImplementingSpec(
  db: Database.Database,
  specId: string,
): Array<{ id: string; status: string }> {
  const rows = db
    .prepare(
      `SELECT i.id, i.status
       FROM issues i
       JOIN relationships r ON r.from_id = i.id AND r.from_type = 'issue'
       WHERE r.to_id = ? AND r.to_type = 'spec'
         AND r.relationship_type = 'implements'`,
    )
    .all(specId) as Array<{ id: string; status: string }>;

  return rows;
}
