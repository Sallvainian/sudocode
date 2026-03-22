/**
 * BMAD-Aware Execution Service
 *
 * Creates sudocode executions with BMAD persona system prompts
 * injected into the agent configuration.
 *
 * @module services/bmad-execution-service
 */

import type Database from "better-sqlite3";
import type { Execution, Issue } from "@sudocode-ai/types";
import type { AgentType } from "@sudocode-ai/types/agents";
import {
  BMAD_PERSONAS,
  getPersonaSystemPrompt,
} from "@sudocode-ai/integration-bmad";
import { ExecutionService, type ExecutionConfig } from "./execution-service.js";
import { getExecution } from "./executions.js";

/**
 * Options for creating a BMAD execution
 */
export interface BmadExecutionOptions {
  mode?: "worktree" | "local";
  model?: string;
  baseBranch?: string;
  timeout?: number;
}

/**
 * Check whether an issue is a BMAD issue by looking for
 * external_links with provider="bmad".
 */
export function isBmadIssue(issue: Issue): boolean {
  if (!issue.external_links) return false;
  try {
    const links =
      typeof issue.external_links === "string"
        ? JSON.parse(issue.external_links)
        : issue.external_links;
    return Array.isArray(links) && links.some((l: { provider?: string }) => l.provider === "bmad");
  } catch {
    return false;
  }
}

/**
 * Create a sudocode execution with a BMAD persona's system prompt
 * injected into the agent config.
 *
 * @param executionService - The project's ExecutionService instance
 * @param db - Database instance (for step_config update)
 * @param issueId - Issue to execute against
 * @param persona - BMAD persona ID (e.g., "dev", "qa", "architect")
 * @param skill - BMAD skill being invoked (e.g., "bmad-dev-story")
 * @param prompt - Execution prompt
 * @param agentType - Agent type (defaults to "claude-code")
 * @param options - Additional execution options
 * @returns The created Execution record
 */
export async function createBmadExecution(
  executionService: ExecutionService,
  db: Database.Database,
  issueId: string,
  persona: string,
  skill: string,
  prompt: string,
  agentType: AgentType = "claude-code",
  options: BmadExecutionOptions = {},
): Promise<Execution> {
  // Validate persona exists
  if (!BMAD_PERSONAS[persona]) {
    const valid = Object.keys(BMAD_PERSONAS).join(", ");
    throw new Error(`Unknown BMAD persona "${persona}". Valid personas: ${valid}`);
  }

  // Build the persona system prompt
  const personaPrompt = getPersonaSystemPrompt(persona);

  // Build execution config with the persona prompt appended
  const config: ExecutionConfig = {
    mode: options.mode || "worktree",
    model: options.model,
    baseBranch: options.baseBranch,
    timeout: options.timeout,
    appendSystemPrompt: personaPrompt,
  };

  // Create the execution via the standard ExecutionService
  const execution = await executionService.createExecution(
    issueId,
    config,
    prompt,
    agentType,
  );

  // Store BMAD metadata in step_config for UI display
  const bmadStepConfig = JSON.stringify({
    bmadPersona: persona,
    bmadSkill: skill,
    bmadPersonaName: BMAD_PERSONAS[persona].name,
    bmadPersonaRole: BMAD_PERSONAS[persona].role,
  });

  db.prepare("UPDATE executions SET step_config = ? WHERE id = ?").run(
    bmadStepConfig,
    execution.id,
  );

  // Return the updated execution
  return getExecution(db, execution.id) || execution;
}
