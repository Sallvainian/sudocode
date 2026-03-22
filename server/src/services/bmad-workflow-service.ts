/**
 * BMAD Workflow Service
 *
 * Generates sudocode Workflows from BMAD's 4-phase methodology structure.
 *
 * BMAD Phases:
 *   Phase 1 (Discovery):   brainstorming → research → product-brief
 *   Phase 2 (Planning):    PRD → UX-design → architecture
 *   Phase 3 (Preparation): epics → readiness-check
 *   Phase 4 (Execution):   sprint-planning → (create-story → dev-story → code-review)* → retrospective
 *
 * Phases 1-3 are sequential workflows (one step after another).
 * Phase 4 is an orchestrator workflow (story cycle repeats per story).
 */

import type {
  WorkflowConfig,
  WorkflowSource,
  WorkflowStep,
} from "@sudocode-ai/types";

// =============================================================================
// BMAD Phase Definitions
// =============================================================================

export interface BmadPhase {
  /** Phase number (1-4) */
  number: number;
  /** Phase name */
  name: string;
  /** Human-readable title */
  title: string;
  /** Steps in this phase */
  steps: BmadPhaseStep[];
  /** Workflow engine type */
  engineType: "sequential" | "orchestrator";
}

export interface BmadPhaseStep {
  /** Step identifier (kebab-case) */
  id: string;
  /** Human-readable label */
  label: string;
  /** BMAD agent/persona that handles this step */
  persona?: string;
  /** BMAD skill name (maps to a superpowers skill) */
  skill?: string;
  /** IDs of steps this depends on (within the same phase) */
  dependsOn?: string[];
  /** Whether this step is required (default: true) */
  required?: boolean;
}

/**
 * BMAD Phase 1: Discovery
 */
const PHASE_1_DISCOVERY: BmadPhase = {
  number: 1,
  name: "discovery",
  title: "Phase 1: Discovery",
  engineType: "sequential",
  steps: [
    { id: "brainstorming", label: "Brainstorming Session", persona: "analyst", skill: "bmad-brainstorming", required: false },
    {
      id: "domain-research",
      label: "Domain Research",
      persona: "analyst",
      skill: "bmad-domain-research",
      dependsOn: ["brainstorming"],
      required: false,
    },
    {
      id: "market-research",
      label: "Market Research",
      persona: "analyst",
      skill: "bmad-market-research",
      dependsOn: ["brainstorming"],
      required: false,
    },
    {
      id: "product-brief",
      label: "Product Brief",
      persona: "pm",
      skill: "bmad-product-brief",
      dependsOn: ["domain-research", "market-research"],
      required: false,
    },
  ],
};

/**
 * BMAD Phase 2: Planning
 */
const PHASE_2_PLANNING: BmadPhase = {
  number: 2,
  name: "planning",
  title: "Phase 2: Planning",
  engineType: "sequential",
  steps: [
    {
      id: "prd",
      label: "Product Requirements Document",
      persona: "pm",
      skill: "bmad-create-prd",
      required: true,
    },
    {
      id: "ux-design",
      label: "UX Design Specification",
      persona: "ux-designer",
      skill: "bmad-create-ux-design",
      dependsOn: ["prd"],
    },
    {
      id: "architecture",
      label: "Architecture Design",
      persona: "architect",
      skill: "bmad-create-architecture",
      dependsOn: ["prd"],
      required: true,
    },
  ],
};

/**
 * BMAD Phase 3: Preparation
 */
const PHASE_3_PREPARATION: BmadPhase = {
  number: 3,
  name: "preparation",
  title: "Phase 3: Preparation",
  engineType: "sequential",
  steps: [
    {
      id: "epics-stories",
      label: "Create Epics & Stories",
      persona: "sm",
      skill: "bmad-create-epics-and-stories",
      required: true,
    },
    {
      id: "readiness-check",
      label: "Implementation Readiness Check",
      persona: "architect",
      skill: "bmad-check-implementation-readiness",
      dependsOn: ["epics-stories"],
      required: true,
    },
  ],
};

/**
 * BMAD Phase 4: Execution (orchestrator-managed story cycle)
 */
const PHASE_4_EXECUTION: BmadPhase = {
  number: 4,
  name: "execution",
  title: "Phase 4: Execution",
  engineType: "orchestrator",
  steps: [
    {
      id: "sprint-planning",
      label: "Sprint Planning",
      persona: "sm",
      skill: "bmad-sprint-planning",
    },
    {
      id: "create-story",
      label: "Create Story Spec",
      persona: "sm",
      skill: "bmad-create-story",
      dependsOn: ["sprint-planning"],
    },
    {
      id: "dev-story",
      label: "Develop Story",
      persona: "dev",
      skill: "bmad-dev-story",
      dependsOn: ["create-story"],
    },
    {
      id: "code-review",
      label: "Code Review",
      persona: "dev",
      skill: "bmad-code-review",
      dependsOn: ["dev-story"],
    },
    {
      id: "retrospective",
      label: "Epic Retrospective",
      persona: "sm",
      skill: "bmad-retrospective",
      dependsOn: ["code-review"],
    },
  ],
};

/** All BMAD phases */
export const BMAD_PHASES: readonly BmadPhase[] = [
  PHASE_1_DISCOVERY,
  PHASE_2_PLANNING,
  PHASE_3_PREPARATION,
  PHASE_4_EXECUTION,
] as const;

// =============================================================================
// Workflow Generation
// =============================================================================

export interface GenerateWorkflowOptions {
  /** Which phases to include (default: all 4) */
  phases?: number[];
  /** Goal description for orchestrator phases */
  goal?: string;
  /** Base branch for worktree */
  baseBranch?: string;
  /** Custom title */
  title?: string;
}

export interface GeneratedWorkflow {
  title: string;
  source: WorkflowSource;
  config: Partial<WorkflowConfig>;
  steps: Omit<WorkflowStep, "id" | "executionId" | "commitSha" | "error">[];
}

/**
 * Generate a sudocode Workflow template from BMAD phase structure.
 *
 * For sequential phases (1-3), creates a sequential workflow with
 * dependency-ordered steps.
 *
 * For the execution phase (4), creates an orchestrator workflow
 * where the AI agent manages the story cycle dynamically.
 */
export function generateBmadWorkflow(
  options: GenerateWorkflowOptions = {},
): GeneratedWorkflow[] {
  const phaseNums = options.phases ?? [1, 2, 3, 4];
  const workflows: GeneratedWorkflow[] = [];

  for (const phaseNum of phaseNums) {
    const phase = BMAD_PHASES.find((p) => p.number === phaseNum);
    if (!phase) continue;

    workflows.push(generatePhaseWorkflow(phase, options));
  }

  return workflows;
}

/**
 * Generate a single workflow for one BMAD phase.
 */
function generatePhaseWorkflow(
  phase: BmadPhase,
  options: GenerateWorkflowOptions,
): GeneratedWorkflow {
  const title = options.title
    ? `${options.title} - ${phase.title}`
    : `BMAD ${phase.title}`;

  const steps = phase.steps.map((step, index) => ({
    issueId: "", // Populated when issues are created
    index,
    dependencies: resolveDependencyIndices(step, phase.steps),
    status: index === 0 ? ("ready" as const) : ("pending" as const),
  }));

  if (phase.engineType === "orchestrator") {
    return {
      title,
      source: {
        type: "goal" as const,
        goal:
          options.goal ??
          `Execute BMAD ${phase.title}: cycle through stories using sprint-planning → create-story → dev-story → code-review → retrospective`,
      },
      config: {
        engineType: "orchestrator",
        parallelism: "sequential",
        onFailure: "pause",
        autoCommitAfterStep: true,
        defaultAgentType: "claude-code",
        autonomyLevel: "human_in_the_loop",
        baseBranch: options.baseBranch,
      },
      steps,
    };
  }

  // Sequential phases (1-3)
  return {
    title,
    source: {
      type: "issues" as const,
      issueIds: [], // Populated when issues are created
    },
    config: {
      engineType: "sequential",
      parallelism: "sequential",
      onFailure: "pause",
      autoCommitAfterStep: true,
      defaultAgentType: "claude-code",
      autonomyLevel: "human_in_the_loop",
      baseBranch: options.baseBranch,
    },
    steps,
  };
}

/**
 * Resolve step dependency IDs to step indices within the phase.
 */
function resolveDependencyIndices(
  step: BmadPhaseStep,
  allSteps: BmadPhaseStep[],
): string[] {
  if (!step.dependsOn?.length) return [];

  return step.dependsOn
    .map((depId) => {
      const depIndex = allSteps.findIndex((s) => s.id === depId);
      return depIndex >= 0 ? String(depIndex) : null;
    })
    .filter((id): id is string => id !== null);
}

// =============================================================================
// Phase Info Helpers
// =============================================================================

/**
 * Get phase information by number.
 */
export function getBmadPhase(phaseNumber: number): BmadPhase | undefined {
  return BMAD_PHASES.find((p) => p.number === phaseNumber);
}

/**
 * Get all phase step labels for a given phase.
 */
export function getPhaseStepLabels(phaseNumber: number): string[] {
  const phase = getBmadPhase(phaseNumber);
  if (!phase) return [];
  return phase.steps.map((s) => s.label);
}

/**
 * Get the BMAD persona associated with a step.
 */
export function getStepPersona(
  phaseNumber: number,
  stepId: string,
): string | undefined {
  const phase = getBmadPhase(phaseNumber);
  if (!phase) return undefined;
  return phase.steps.find((s) => s.id === stepId)?.persona;
}
