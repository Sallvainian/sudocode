/**
 * BMAD API routes
 *
 * Provides BMAD-specific endpoints for checking installation status,
 * listing agent personas, scanning artifacts, and triggering imports.
 */

import { Router, Request, Response } from "express";
import { existsSync, readdirSync, statSync } from "fs";
import * as path from "path";
import {
  generateBmadWorkflow,
  BMAD_PHASES,
  type GenerateWorkflowOptions,
} from "../services/bmad-workflow-service.js";
import {
  applyGateResult,
  resolveGate,
  type GateType,
  type GateResult,
  type GateItem,
} from "../services/bmad-gate-service.js";
import {
  createBmadExecution,
} from "../services/bmad-execution-service.js";
import { BMAD_PERSONAS } from "@sudocode-ai/integration-bmad";
import { agentRegistryService } from "../services/agent-registry.js";
import {
  AgentNotFoundError,
  AgentNotImplementedError,
} from "../errors/agent-errors.js";

// =============================================================================
// BMAD Agent Persona Definitions (static)
// =============================================================================

interface BmadAgentPersona {
  name: string;
  displayName: string;
  role: string;
  capabilities: string[];
}

const BMAD_AGENTS: BmadAgentPersona[] = [
  {
    name: "analyst",
    displayName: "Mary",
    role: "Strategic Business Analyst",
    capabilities: [
      "requirements discovery",
      "stakeholder analysis",
      "domain research",
      "market research",
    ],
  },
  {
    name: "pm",
    displayName: "John",
    role: "Product Manager",
    capabilities: [
      "PRD creation",
      "requirements documentation",
      "feature prioritization",
      "product strategy",
    ],
  },
  {
    name: "architect",
    displayName: "Winston",
    role: "System Architect",
    capabilities: [
      "architecture design",
      "technical decisions",
      "system design",
      "technology selection",
    ],
  },
  {
    name: "ux-designer",
    displayName: "Sally",
    role: "UX Designer",
    capabilities: [
      "UX design",
      "UI specifications",
      "user flow design",
      "accessibility",
    ],
  },
  {
    name: "sm",
    displayName: "Bob",
    role: "Scrum Master",
    capabilities: [
      "sprint planning",
      "story preparation",
      "epic breakdown",
      "sprint status tracking",
    ],
  },
  {
    name: "dev",
    displayName: "Amos",
    role: "Senior Software Engineer",
    capabilities: [
      "story implementation",
      "code development",
      "technical execution",
      "code review",
    ],
  },
  {
    name: "qa",
    displayName: "Quinn",
    role: "QA Engineer",
    capabilities: [
      "test automation",
      "test coverage",
      "quality assurance",
      "bug tracking",
    ],
  },
  {
    name: "tech-writer",
    displayName: "Paige",
    role: "Technical Writer",
    capabilities: [
      "documentation",
      "knowledge curation",
      "API docs",
      "user guides",
    ],
  },
  {
    name: "quick-flow-solo-dev",
    displayName: "Barry",
    role: "Full-Stack Developer",
    capabilities: [
      "rapid prototyping",
      "full-stack development",
      "solo implementation",
      "quick iteration",
    ],
  },
];

// =============================================================================
// BMAD Phase Detection
// =============================================================================

type BmadPhase = "analysis" | "planning" | "solutioning" | "implementation";

interface ArtifactInfo {
  type: string;
  filename: string;
  exists: boolean;
  filePath?: string;
  size?: number;
  modifiedAt?: string;
}

/**
 * Determine the current BMAD phase based on which artifacts exist.
 */
function detectPhase(artifacts: ArtifactInfo[]): BmadPhase {
  const existing = new Set(
    artifacts.filter((a) => a.exists).map((a) => a.type),
  );

  if (existing.has("story") || existing.has("sprint-status")) {
    return "implementation";
  }
  if (existing.has("epic") || existing.has("ux-spec")) {
    return "solutioning";
  }
  if (existing.has("architecture") || existing.has("prd")) {
    return "planning";
  }
  if (existing.has("product-brief") || existing.has("project-context")) {
    return "analysis";
  }
  return "analysis";
}

/**
 * Scan a project for BMAD artifacts.
 */
function scanArtifacts(projectPath: string): ArtifactInfo[] {
  const bmadOutput = path.join(projectPath, "_bmad-output");
  const artifacts: ArtifactInfo[] = [];

  // Planning artifacts (files in _bmad-output/)
  const planningFiles: Array<{ type: string; patterns: string[] }> = [
    { type: "prd", patterns: ["PRD.md", "prd.md"] },
    {
      type: "architecture",
      patterns: ["architecture.md", "Architecture.md"],
    },
    { type: "ux-spec", patterns: ["ux-spec.md", "UX-Spec.md", "ux_spec.md"] },
    {
      type: "product-brief",
      patterns: ["product-brief.md", "Product-Brief.md"],
    },
    {
      type: "project-context",
      patterns: ["project-context.md", "Project-Context.md"],
    },
  ];

  for (const file of planningFiles) {
    let found = false;
    for (const pattern of file.patterns) {
      const filePath = path.join(bmadOutput, pattern);
      if (existsSync(filePath)) {
        const stat = statSync(filePath);
        artifacts.push({
          type: file.type,
          filename: pattern,
          exists: true,
          filePath,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
        found = true;
        break;
      }
    }
    if (!found) {
      artifacts.push({
        type: file.type,
        filename: file.patterns[0],
        exists: false,
      });
    }
  }

  // Epic files (_bmad-output/epics/)
  const epicsDir = path.join(bmadOutput, "epics");
  if (existsSync(epicsDir)) {
    try {
      const entries = readdirSync(epicsDir);
      for (const entry of entries) {
        if (entry.match(/^epic-\d+\.md$/i)) {
          const filePath = path.join(epicsDir, entry);
          const stat = statSync(filePath);
          artifacts.push({
            type: "epic",
            filename: entry,
            exists: true,
            filePath,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Story files (_bmad-output/stories/ or _bmad-output/)
  const storyDirs = [
    path.join(bmadOutput, "stories"),
    bmadOutput,
  ];
  for (const dir of storyDirs) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.match(/^story-.*\.md$/i)) {
          const filePath = path.join(dir, entry);
          const stat = statSync(filePath);
          artifacts.push({
            type: "story",
            filename: entry,
            exists: true,
            filePath,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Sprint status file
  const sprintFile = path.join(bmadOutput, "sprint-status.yaml");
  if (existsSync(sprintFile)) {
    const stat = statSync(sprintFile);
    artifacts.push({
      type: "sprint-status",
      filename: "sprint-status.yaml",
      exists: true,
      filePath: sprintFile,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  } else {
    artifacts.push({
      type: "sprint-status",
      filename: "sprint-status.yaml",
      exists: false,
    });
  }

  return artifacts;
}

// =============================================================================
// Router
// =============================================================================

export function createBmadRouter(): Router {
  const router = Router();

  /**
   * GET /api/bmad/status
   *
   * Returns BMAD installation info: whether _bmad/ and _bmad-output/ exist,
   * current phase, and artifact existence summary.
   */
  router.get("/status", (req: Request, res: Response) => {
    try {
      const projectPath = req.project!.path;

      const bmadDir = path.join(projectPath, "_bmad");
      const bmadConfigDir = path.join(bmadDir, "_config");
      const bmadOutputDir = path.join(projectPath, "_bmad-output");

      const installed = existsSync(bmadDir);
      const hasConfig = existsSync(bmadConfigDir);
      const hasOutput = existsSync(bmadOutputDir);

      const artifacts = hasOutput ? scanArtifacts(projectPath) : [];
      const currentPhase = artifacts.length > 0 ? detectPhase(artifacts) : null;

      const artifactSummary = {
        total: artifacts.length,
        existing: artifacts.filter((a) => a.exists).length,
        types: [...new Set(artifacts.filter((a) => a.exists).map((a) => a.type))],
      };

      res.status(200).json({
        success: true,
        data: {
          installed,
          hasConfig,
          hasOutput,
          currentPhase,
          artifactSummary,
        },
      });
    } catch (error) {
      console.error("[bmad] Failed to get status:", error);
      res.status(500).json({ error: "Failed to get BMAD status" });
    }
  });

  /**
   * GET /api/bmad/agents
   *
   * Returns the 9 BMAD agent personas with name, role, and capabilities.
   */
  router.get("/agents", (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: { agents: BMAD_AGENTS },
    });
  });

  /**
   * GET /api/bmad/artifacts
   *
   * Scans _bmad-output/ and lists all artifacts with type, existence, and metadata.
   */
  router.get("/artifacts", (req: Request, res: Response) => {
    try {
      const projectPath = req.project!.path;
      const bmadOutputDir = path.join(projectPath, "_bmad-output");

      if (!existsSync(bmadOutputDir)) {
        res.status(200).json({
          success: true,
          data: {
            artifacts: [],
            message: "_bmad-output/ directory not found",
          },
        });
        return;
      }

      const artifacts = scanArtifacts(projectPath);
      const currentPhase = detectPhase(artifacts);

      res.status(200).json({
        success: true,
        data: {
          artifacts,
          currentPhase,
        },
      });
    } catch (error) {
      console.error("[bmad] Failed to scan artifacts:", error);
      res.status(500).json({ error: "Failed to scan BMAD artifacts" });
    }
  });

  /**
   * POST /api/bmad/import
   *
   * Triggers a full BMAD plugin sync via the integration sync service.
   * Equivalent to POST /api/plugins/bmad/sync but BMAD-specific.
   */
  router.post("/import", async (req: Request, res: Response) => {
    try {
      if (!req.project!.integrationSyncService) {
        res.status(500).json({
          success: false,
          error: "Integration sync service not available",
        });
        return;
      }

      const results =
        await req.project!.integrationSyncService.syncProvider("bmad");

      res.status(200).json({
        success: true,
        data: {
          message: "BMAD import completed",
          results,
        },
      });
    } catch (error) {
      console.error("[bmad] Failed to import:", error);
      res.status(500).json({
        success: false,
        error: `Failed to import BMAD artifacts: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  /**
   * POST /api/bmad/workflow
   *
   * Generates a BMAD workflow template from the 4-phase methodology.
   * Returns the template for review before creating via the workflows API.
   *
   * Body: {
   *   phases?: number[]      // Which phases to include (default: [1,2,3,4])
   *   goal?: string          // Custom goal description
   *   baseBranch?: string    // Base branch for worktree
   *   title?: string         // Custom workflow title
   * }
   */
  router.post("/workflow", (req: Request, res: Response) => {
    try {
      const options = req.body as GenerateWorkflowOptions;
      const workflows = generateBmadWorkflow(options);

      res.status(200).json({
        success: true,
        data: {
          workflows,
          phases: BMAD_PHASES,
        },
      });
    } catch (error) {
      console.error("[bmad] Failed to generate workflow:", error);
      res.status(500).json({
        success: false,
        error: `Failed to generate BMAD workflow: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  /**
   * POST /api/bmad/gate
   *
   * Apply a BMAD quality gate result. Creates feedback entries and
   * optionally blocks dependent issues on failure.
   *
   * Body: {
   *   gateType: "readiness" | "story-validation" | "code-review",
   *   result: "pass" | "concerns" | "fail",
   *   items: Array<{ description, severity?, specId?, issueId?, anchor? }>
   * }
   */
  router.post("/gate", (req: Request, res: Response) => {
    try {
      const db = req.project!.db;
      const { gateType, result, items } = req.body as {
        gateType: GateType;
        result: GateResult;
        items: GateItem[];
      };

      if (!gateType || !result || !items) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: gateType, result, items",
        });
        return;
      }

      const validGateTypes: GateType[] = ["readiness", "story-validation", "code-review"];
      if (!validGateTypes.includes(gateType)) {
        res.status(400).json({
          success: false,
          error: `Invalid gateType: ${gateType}. Must be one of: ${validGateTypes.join(", ")}`,
        });
        return;
      }

      const validResults: GateResult[] = ["pass", "concerns", "fail"];
      if (!validResults.includes(result)) {
        res.status(400).json({
          success: false,
          error: `Invalid result: ${result}. Must be one of: ${validResults.join(", ")}`,
        });
        return;
      }

      const output = applyGateResult(db, { gateType, result, items });

      res.status(200).json({
        success: true,
        data: output,
      });
    } catch (error) {
      console.error("[bmad] Failed to apply gate result:", error);
      res.status(500).json({
        success: false,
        error: `Failed to apply gate result: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  /**
   * POST /api/bmad/gate/resolve
   *
   * Resolve a quality gate: dismiss feedback, remove blocks, unblock issues.
   *
   * Body: { gateType: "readiness" | "story-validation" | "code-review" }
   */
  router.post("/gate/resolve", (req: Request, res: Response) => {
    try {
      const db = req.project!.db;
      const { gateType } = req.body as { gateType: GateType };

      if (!gateType) {
        res.status(400).json({
          success: false,
          error: "Missing required field: gateType",
        });
        return;
      }

      const output = resolveGate(db, gateType);

      res.status(200).json({
        success: true,
        data: output,
      });
    } catch (error) {
      console.error("[bmad] Failed to resolve gate:", error);
      res.status(500).json({
        success: false,
        error: `Failed to resolve gate: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  /**
   * POST /api/bmad/execute
   *
   * Create an execution with a BMAD persona's system prompt injected
   * into the agent configuration.
   *
   * Body: {
   *   issueId: string,        // Issue to execute against
   *   persona: string,        // BMAD persona ID (e.g., "dev", "qa")
   *   skill: string,          // BMAD skill being invoked (e.g., "bmad-dev-story")
   *   prompt?: string,        // Optional prompt (defaults to issue title)
   *   agentType?: AgentType,  // Agent type (defaults to "claude-code")
   *   model?: string,         // Model override
   *   mode?: "worktree" | "local",
   *   baseBranch?: string,
   * }
   */
  router.post("/execute", async (req: Request, res: Response) => {
    try {
      const {
        issueId,
        persona,
        skill,
        prompt,
        agentType,
        model,
        mode,
        baseBranch,
      } = req.body;

      // Validate required fields
      if (!issueId || !persona || !skill) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: issueId, persona, skill",
        });
        return;
      }

      // Validate persona
      if (!BMAD_PERSONAS[persona]) {
        const valid = Object.keys(BMAD_PERSONAS).join(", ");
        res.status(400).json({
          success: false,
          error: `Unknown BMAD persona "${persona}". Valid personas: ${valid}`,
        });
        return;
      }

      // Validate agentType if provided
      if (agentType) {
        if (!agentRegistryService.hasAgent(agentType)) {
          const availableAgents = agentRegistryService
            .getAvailableAgents()
            .map((a) => a.name);
          throw new AgentNotFoundError(agentType, availableAgents);
        }
        if (!agentRegistryService.isAgentImplemented(agentType)) {
          throw new AgentNotImplementedError(agentType);
        }
      }

      // Ensure execution service is available
      if (!req.project!.executionService) {
        res.status(500).json({
          success: false,
          error: "Execution service not available",
        });
        return;
      }

      // Default prompt to a BMAD-flavored message if not provided
      const resolvedPrompt =
        prompt ||
        `Execute BMAD skill "${skill}" as ${BMAD_PERSONAS[persona].name} (${BMAD_PERSONAS[persona].role}) on this issue.`;

      const execution = await createBmadExecution(
        req.project!.executionService,
        req.project!.db,
        issueId,
        persona,
        skill,
        resolvedPrompt,
        agentType || "claude-code",
        { mode, model, baseBranch },
      );

      res.status(201).json({
        success: true,
        data: execution,
      });
    } catch (error) {
      console.error("[bmad] Failed to create BMAD execution:", error);

      if (error instanceof AgentNotFoundError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }

      if (error instanceof AgentNotImplementedError) {
        res.status(501).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: `Failed to create BMAD execution: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  return router;
}
