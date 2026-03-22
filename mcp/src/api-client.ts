/**
 * Sudocode API Client
 *
 * HTTP client for MCP server to communicate with the local sudocode server.
 * Provides methods for extended tools (executions, workflows, inspection, escalation).
 *
 * Note: This client only implements methods for NEW tools that don't exist in the
 * default scope. Issue/spec/relationship/feedback operations use the CLI wrapper.
 */

import type { Execution } from "@sudocode-ai/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Standard API response wrapper.
 */
interface APIResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  error?: string;
}

/**
 * Options for creating the API client.
 */
export interface SudocodeAPIClientConfig {
  /** Base URL of the local server (e.g., "http://localhost:3000") */
  serverUrl: string;
  /** Project ID for X-Project-ID header */
  projectId?: string;
  /** Optional execution ID (when MCP is running inside an execution) */
  executionId?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Error thrown when an API call fails.
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

// =============================================================================
// Parameter Types
// =============================================================================

// Overview
export interface ProjectStatusResult {
  ready_issues: Array<{
    id: string;
    title: string;
    priority: number;
  }>;
  active_executions: Array<{
    id: string;
    issue_id?: string;
    status: string;
    agent_type: string;
  }>;
  running_workflows: Array<{
    id: string;
    status: string;
    title?: string;
  }>;
}

// Executions
export interface ListExecutionsParams {
  status?: string[];
  issue_id?: string;
  limit?: number;
  since?: string;
  tags?: string[];
}

export interface ListExecutionsResult {
  executions: Array<{
    id: string;
    issue_id?: string;
    status: string;
    agent_type: string;
    created_at: string;
  }>;
  count: number;
}

export interface ShowExecutionParams {
  execution_id: string;
}

export interface ShowExecutionResult {
  execution: Execution;
}

export interface StartExecutionParams {
  issue_id: string;
  agent_type?: "claude-code" | "codex" | "copilot" | "cursor";
  model?: string;
  prompt?: string;
}

export interface StartExecutionResult {
  execution_id: string;
  status: string;
}

export interface StartAdhocExecutionParams {
  prompt: string;
  agent_type?: "claude-code" | "codex" | "copilot" | "cursor";
  model?: string;
}

export interface CreateFollowUpParams {
  execution_id: string;
  feedback: string;
}

export interface CreateFollowUpResult {
  execution_id: string;
  parent_execution_id: string;
  status: string;
}

export interface CancelExecutionParams {
  execution_id: string;
  reason?: string;
}

export interface CancelExecutionResult {
  success: boolean;
  message: string;
  final_status: string;
}

// Inspection
export interface ExecutionTrajectoryParams {
  execution_id: string;
  max_entries?: number;
}

export interface ExecutionTrajectoryResult {
  execution_id: string;
  entries: Array<{
    type: "tool_call" | "tool_result" | "message" | "error";
    timestamp: string;
    tool_name?: string;
    tool_args?: Record<string, unknown>;
    content?: string;
  }>;
  summary: {
    total_entries: number;
    tool_calls: number;
    errors: number;
    duration_ms?: number;
  };
}

export interface ExecutionChangesParams {
  execution_id: string;
  include_diff?: boolean;
}

export interface ExecutionChangesResult {
  execution_id: string;
  files: Array<{
    path: string;
    status: "added" | "modified" | "deleted" | "renamed";
    additions: number;
    deletions: number;
    diff?: string;
  }>;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    timestamp: string;
  }>;
  summary: {
    files_changed: number;
    total_additions: number;
    total_deletions: number;
  };
}

export interface ExecutionChainParams {
  execution_id: string;
}

export interface ExecutionChainResult {
  root_id: string;
  executions: Execution[];
}

// Workflows
export interface ListWorkflowsParams {
  status?: string[];
  limit?: number;
}

export interface ShowWorkflowParams {
  workflow_id: string;
}

export interface WorkflowStatusParams {
  workflow_id: string;
}

export interface CreateWorkflowParams {
  source:
    | { type: "issues"; issueIds: string[] }
    | { type: "spec"; specId: string }
    | { type: "root_issue"; issueId: string }
    | { type: "goal"; goal: string };
  config?: Record<string, unknown>;
}

export interface StartWorkflowParams {
  workflow_id: string;
}

export interface PauseWorkflowParams {
  workflow_id: string;
}

export interface CancelWorkflowParams {
  workflow_id: string;
}

export interface ResumeWorkflowParams {
  workflow_id: string;
}


// BMAD
export interface BmadStatusResult {
  installed: boolean;
  hasConfig: boolean;
  hasOutput: boolean;
  currentPhase: string | null;
  artifactSummary: {
    total: number;
    existing: number;
    types: string[];
  };
}

export interface BmadArtifactsResult {
  artifacts: Array<{
    type: string;
    filename: string;
    exists: boolean;
  }>;
  currentPhase: string;
}

export interface BmadNextStepResult {
  skill: string;
  persona: string;
  description: string;
  phase: string;
}

export interface BmadRunSkillParams {
  skill: string;
  issue_id?: string;
  persona?: string;
  agent_type?: "claude-code" | "codex" | "copilot" | "cursor";
}

/**
 * Map BMAD skills to their default persona.
 */
const SKILL_PERSONA_MAP: Record<string, string> = {
  "create-product-brief": "analyst",
  "domain-research": "analyst",
  "market-research": "analyst",
  "create-prd": "pm",
  "edit-prd": "pm",
  "validate-prd": "pm",
  "create-architecture": "architect",
  "create-ux-design": "ux-designer",
  "create-epics-and-stories": "sm",
  "sprint-planning": "sm",
  "create-story": "sm",
  "dev-story": "dev",
  "quick-dev": "quick-flow-solo-dev",
  "code-review": "dev",
  "check-implementation-readiness": "pm",
};

/**
 * Determine the next recommended BMAD step based on artifact state.
 */
function computeNextStep(
  status: BmadStatusResult,
  artifacts: BmadArtifactsResult,
): BmadNextStepResult {
  const existingTypes = new Set(
    artifacts.artifacts.filter((a) => a.exists).map((a) => a.type),
  );

  if (!existingTypes.has("product-brief") && !existingTypes.has("project-context")) {
    return {
      skill: "create-product-brief",
      persona: "analyst",
      description: "Start by creating a product brief to capture the project vision and goals",
      phase: "analysis",
    };
  }

  if (!existingTypes.has("prd")) {
    return {
      skill: "create-prd",
      persona: "pm",
      description: "Create a Product Requirements Document from the product brief",
      phase: "planning",
    };
  }

  if (!existingTypes.has("architecture")) {
    return {
      skill: "create-architecture",
      persona: "architect",
      description: "Design the system architecture based on the PRD",
      phase: "planning",
    };
  }

  if (!existingTypes.has("ux-spec")) {
    return {
      skill: "create-ux-design",
      persona: "ux-designer",
      description: "Create UX specifications and design patterns",
      phase: "solutioning",
    };
  }

  if (!existingTypes.has("epic")) {
    return {
      skill: "create-epics-and-stories",
      persona: "sm",
      description: "Break down requirements into epics and user stories",
      phase: "solutioning",
    };
  }

  if (!existingTypes.has("story")) {
    return {
      skill: "create-story",
      persona: "sm",
      description: "Create detailed story files for implementation",
      phase: "solutioning",
    };
  }

  return {
    skill: "dev-story",
    persona: "dev",
    description: "All planning artifacts are complete. Ready to implement stories.",
    phase: "implementation",
  };
}

// =============================================================================
// API Client
// =============================================================================

/**
 * HTTP client for sudocode MCP server to communicate with local server.
 *
 * All methods throw APIError on failure.
 */
export class SudocodeAPIClient {
  private serverUrl: string;
  private projectId?: string;
  private executionId?: string;
  private timeout: number;

  constructor(config: SudocodeAPIClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, ""); // Remove trailing slash
    this.projectId = config.projectId;
    this.executionId = config.executionId;
    this.timeout = config.timeout ?? 30000;

    // Debug: Log configuration
    if (process.env.DEBUG_MCP) {
      console.error(`[SudocodeAPIClient] serverUrl=${this.serverUrl}, projectId=${this.projectId}`);
    }
  }

  // ===========================================================================
  // HTTP Helpers
  // ===========================================================================

  /**
   * Make an HTTP request to the API.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.serverUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.projectId) {
        headers["X-Project-ID"] = this.projectId;
      } else {
        // Warn if projectId is missing - API will likely reject the request
        console.error(`[SudocodeAPIClient] WARNING: No projectId set, X-Project-ID header will not be sent`);
      }

      // Debug: Log request details
      if (process.env.DEBUG_MCP) {
        console.error(`[SudocodeAPIClient] ${method} ${url}`);
        console.error(`[SudocodeAPIClient] Headers: ${JSON.stringify(headers)}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is HTML (error page) before trying to parse as JSON
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new APIError(
          `Server returned non-JSON response: ${text.substring(0, 100)}`,
          response.status
        );
      }

      const data = (await response.json()) as APIResponse<T>;

      if (!response.ok || !data.success) {
        throw new APIError(
          data.message || data.error || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new APIError(`Request timeout after ${this.timeout}ms`, 408);
        }
        // Connection refused, network error, etc.
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed")
        ) {
          throw new APIError(
            `Cannot connect to server at ${this.serverUrl}. Is the server running?`,
            0
          );
        }
        throw new APIError(error.message, 0);
      }

      throw new APIError(String(error), 0);
    }
  }

  /**
   * Build query string from params object.
   */
  private buildQuery(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          parts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`
          );
        }
      } else {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        );
      }
    }
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  // ===========================================================================
  // Project Methods
  // ===========================================================================

  /**
   * Open a project by path.
   * This must be called before other API methods if the project isn't already open.
   */
  async openProject(projectPath: string): Promise<{ id: string; path: string }> {
    return this.request<{ id: string; path: string }>("POST", "/api/projects/open", {
      path: projectPath,
    });
  }

  // ===========================================================================
  // Overview Methods
  // ===========================================================================

  /**
   * Get current project status including ready issues, active executions, running workflows.
   */
  async getProjectStatus(): Promise<ProjectStatusResult> {
    return this.request<ProjectStatusResult>("GET", "/api/project/status");
  }

  // ===========================================================================
  // Execution Methods
  // ===========================================================================

  /**
   * List executions with optional filters.
   */
  async listExecutions(
    params: ListExecutionsParams = {}
  ): Promise<ListExecutionsResult> {
    const query = this.buildQuery({
      status: params.status,
      issue_id: params.issue_id,
      limit: params.limit,
      since: params.since,
      tags: params.tags,
    });
    return this.request<ListExecutionsResult>("GET", `/api/executions${query}`);
  }

  /**
   * Get execution details.
   */
  async showExecution(params: ShowExecutionParams): Promise<ShowExecutionResult> {
    const execution = await this.request<Execution>(
      "GET",
      `/api/executions/${params.execution_id}`
    );
    return { execution };
  }

  /**
   * Start execution for an issue.
   */
  async startExecution(
    params: StartExecutionParams
  ): Promise<StartExecutionResult> {
    const execution = await this.request<any>(
      "POST",
      `/api/issues/${params.issue_id}/executions`,
      {
        agent_type: params.agent_type,
        model: params.model,
        prompt: params.prompt,
      }
    );
    return {
      execution_id: execution.id,
      status: execution.status,
    };
  }

  /**
   * Start adhoc execution without an issue.
   */
  async startAdhocExecution(
    params: StartAdhocExecutionParams
  ): Promise<StartExecutionResult> {
    const execution = await this.request<any>("POST", "/api/executions", {
      prompt: params.prompt,
      agent_type: params.agent_type,
      model: params.model,
    });
    return {
      execution_id: execution.id,
      status: execution.status,
    };
  }

  /**
   * Create follow-up execution.
   */
  async createFollowUp(
    params: CreateFollowUpParams
  ): Promise<CreateFollowUpResult> {
    const execution = await this.request<any>(
      "POST",
      `/api/executions/${params.execution_id}/follow-up`,
      { feedback: params.feedback }
    );
    return {
      execution_id: execution.id,
      parent_execution_id: execution.parent_execution_id,
      status: execution.status,
    };
  }

  /**
   * Cancel a running execution.
   */
  async cancelExecution(
    params: CancelExecutionParams
  ): Promise<CancelExecutionResult> {
    return this.request<CancelExecutionResult>(
      "POST",
      `/api/executions/${params.execution_id}/cancel`,
      { reason: params.reason }
    );
  }

  // ===========================================================================
  // Inspection Methods
  // ===========================================================================

  /**
   * Get execution trajectory (tool calls, actions).
   */
  async getExecutionTrajectory(
    params: ExecutionTrajectoryParams
  ): Promise<ExecutionTrajectoryResult> {
    const query = this.buildQuery({ max_entries: params.max_entries });
    return this.request<ExecutionTrajectoryResult>(
      "GET",
      `/api/executions/${params.execution_id}/trajectory${query}`
    );
  }

  /**
   * Get execution code changes.
   */
  async getExecutionChanges(
    params: ExecutionChangesParams
  ): Promise<ExecutionChangesResult> {
    const query = this.buildQuery({ include_diff: params.include_diff });
    return this.request<ExecutionChangesResult>(
      "GET",
      `/api/executions/${params.execution_id}/changes${query}`
    );
  }

  /**
   * Get execution chain (root + follow-ups).
   */
  async getExecutionChain(
    params: ExecutionChainParams
  ): Promise<ExecutionChainResult> {
    const result = await this.request<{ rootId: string; executions: Execution[] }>(
      "GET",
      `/api/executions/${params.execution_id}/chain`
    );
    return {
      root_id: result.rootId,
      executions: result.executions,
    };
  }

  // ===========================================================================
  // Workflow Methods
  // ===========================================================================

  /**
   * List workflows.
   */
  async listWorkflows(params: ListWorkflowsParams = {}): Promise<unknown> {
    const query = this.buildQuery({
      status: params.status,
      limit: params.limit,
    });
    return this.request("GET", `/api/workflows${query}`);
  }

  /**
   * Get workflow details.
   */
  async showWorkflow(params: ShowWorkflowParams): Promise<unknown> {
    return this.request("GET", `/api/workflows/${params.workflow_id}`);
  }

  /**
   * Get workflow extended status with steps.
   */
  async getWorkflowStatus(params: WorkflowStatusParams): Promise<unknown> {
    return this.request("GET", `/api/workflows/${params.workflow_id}/status`);
  }

  /**
   * Create a new workflow.
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<unknown> {
    return this.request("POST", "/api/workflows", {
      source: params.source,
      config: params.config,
    });
  }

  /**
   * Start a pending workflow.
   */
  async startWorkflow(params: StartWorkflowParams): Promise<unknown> {
    return this.request("POST", `/api/workflows/${params.workflow_id}/start`);
  }

  /**
   * Pause a running workflow.
   */
  async pauseWorkflow(params: PauseWorkflowParams): Promise<unknown> {
    return this.request("POST", `/api/workflows/${params.workflow_id}/pause`);
  }

  /**
   * Cancel a workflow.
   */
  async cancelWorkflow(params: CancelWorkflowParams): Promise<unknown> {
    return this.request("POST", `/api/workflows/${params.workflow_id}/cancel`);
  }

  /**
   * Resume a paused workflow.
   */
  async resumeWorkflow(params: ResumeWorkflowParams): Promise<unknown> {
    return this.request("POST", `/api/workflows/${params.workflow_id}/resume`);
  }

  // ===========================================================================
  // BMAD Methods
  // ===========================================================================

  /**
   * Get BMAD status (phase, artifacts, progress).
   */
  async getBmadStatus(): Promise<BmadStatusResult> {
    return this.request<BmadStatusResult>("GET", "/api/bmad/status");
  }

  /**
   * Get next recommended BMAD step.
   */
  async getBmadNextStep(): Promise<BmadNextStepResult> {
    // Fetch status and artifacts, then compute next step
    const status = await this.request<BmadStatusResult>("GET", "/api/bmad/status");
    const artifacts = await this.request<BmadArtifactsResult>("GET", "/api/bmad/artifacts");
    return computeNextStep(status, artifacts);
  }

  /**
   * Run a BMAD skill by creating an execution.
   */
  async runBmadSkill(params: BmadRunSkillParams): Promise<unknown> {
    const persona = params.persona || SKILL_PERSONA_MAP[params.skill] || "dev";
    const prompt = `Run BMAD skill: ${params.skill} (as ${persona} persona)`;

    if (params.issue_id) {
      return this.request("POST", `/api/issues/${params.issue_id}/executions`, {
        agent_type: params.agent_type || "claude-code",
        prompt,
      });
    }

    return this.request("POST", "/api/executions", {
      agent_type: params.agent_type || "claude-code",
      prompt,
    });
  }
}
