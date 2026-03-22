import type { PluginConfigSchema } from "@sudocode-ai/types";

// =============================================================================
// Plugin Configuration
// =============================================================================

/**
 * Plugin configuration options (what users set in the UI)
 */
export interface BmadPluginOptions {
  /** Path to _bmad-output/ directory (relative to project root) */
  path: string;
  /** Prefix for spec IDs (default: "bm") */
  spec_prefix?: string;
  /** Prefix for epic IDs (default: "bme") */
  epic_prefix?: string;
  /** Prefix for story IDs (default: "bms") */
  story_prefix?: string;
  /** Import project-context.md as a spec (default: true) */
  import_project_context?: boolean;
  /** Sync sprint-status.yaml status changes (default: true) */
  sync_sprint_status?: boolean;
}

// =============================================================================
// Parsed BMAD Artifacts
// =============================================================================

/**
 * A parsed BMAD planning artifact (PRD, architecture, ux-spec, etc.)
 */
export interface ParsedArtifact {
  type: "prd" | "architecture" | "ux-spec" | "product-brief" | "project-context";
  title: string;
  content: string;
  filePath: string;
  frontmatter: Record<string, unknown>;
  sections: ParsedSection[];
}

/**
 * A section within a parsed markdown artifact
 */
export interface ParsedSection {
  heading: string;
  level: number;
  content: string;
  startLine: number;
}

// =============================================================================
// Epics
// =============================================================================

/**
 * A parsed BMAD epic file (epics/epic-N.md)
 */
export interface ParsedEpic {
  number: number;
  title: string;
  description: string;
  filePath: string;
  stories: ParsedInlineStory[];
  status?: BmadEpicStatus;
}

/**
 * An inline story reference within an epic file
 */
export interface ParsedInlineStory {
  number: number;
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  dependsOn?: number[];
}

// =============================================================================
// Stories
// =============================================================================

/**
 * A parsed standalone story file (story-{slug}.md)
 */
export interface ParsedStory {
  epicNumber: number;
  storyNumber: number;
  title: string;
  slug: string;
  content: string;
  filePath: string;
  frontmatter: Record<string, unknown>;
  acceptanceCriteria: AcceptanceCriterion[];
  tasks: StoryTask[];
  status?: BmadStoryStatus;
}

/**
 * A Given/When/Then acceptance criterion
 */
export interface AcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
}

/**
 * A task within a story
 */
export interface StoryTask {
  id: string;
  title: string;
  completed: boolean;
  subtasks?: StoryTask[];
}

export type BmadStoryStatus =
  | "backlog"
  | "ready-for-dev"
  | "in-progress"
  | "review"
  | "done";

export type BmadEpicStatus = "backlog" | "in-progress" | "done";

// =============================================================================
// Sprint Status
// =============================================================================

/**
 * Parsed sprint-status.yaml
 */
export interface ParsedSprintStatus {
  currentSprint?: number;
  epics: SprintEpic[];
}

/**
 * An epic entry within sprint-status.yaml
 */
export interface SprintEpic {
  epicNumber: number;
  title: string;
  status: BmadEpicStatus;
  stories: SprintStory[];
  retrospective?: { status: string };
}

/**
 * A story entry within sprint-status.yaml
 */
export interface SprintStory {
  /** kebab-case key from YAML */
  key: string;
  title: string;
  status: BmadStoryStatus;
}

// =============================================================================
// BMAD Phase Tracking
// =============================================================================

/**
 * The 4 phases of the BMAD methodology
 */
export type BmadPhase = "analysis" | "planning" | "solutioning" | "implementation";

// =============================================================================
// Config Schema (for UI form generation)
// =============================================================================

export const configSchema: PluginConfigSchema = {
  type: "object",
  properties: {
    path: {
      type: "string",
      title: "BMAD Output Path",
      description: "Path to the _bmad-output/ directory (relative to project root)",
      default: "_bmad-output",
      required: true,
    },
    spec_prefix: {
      type: "string",
      title: "Spec Prefix",
      description: "Prefix for spec IDs imported from BMAD artifacts",
      default: "bm",
    },
    epic_prefix: {
      type: "string",
      title: "Epic Prefix",
      description: "Prefix for epic IDs",
      default: "bme",
    },
    story_prefix: {
      type: "string",
      title: "Story Prefix",
      description: "Prefix for story IDs",
      default: "bms",
    },
    import_project_context: {
      type: "boolean",
      title: "Import Project Context",
      description: "Import project-context.md as a spec",
      default: true,
    },
    sync_sprint_status: {
      type: "boolean",
      title: "Sync Sprint Status",
      description: "Sync story/epic status from sprint-status.yaml",
      default: true,
    },
  },
  required: ["path"],
};
