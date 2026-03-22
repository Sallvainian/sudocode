/**
 * Entity mapping between BMAD artifacts and sudocode entities.
 *
 * Maps BMAD planning artifacts → sudocode Specs
 * Maps BMAD epics/stories → sudocode Issues (with parent/child hierarchy)
 */

import type {
  ExternalEntity,
  Spec,
  Issue,
} from "@sudocode-ai/types";

/** Relationship type derived from ExternalEntity to avoid subpath import */
type ExternalRelationship = NonNullable<ExternalEntity["relationships"]>[number];
import type {
  ParsedArtifact,
  ParsedEpic,
  ParsedStory,
  ParsedSprintStatus,
  BmadStoryStatus,
  BmadEpicStatus,
  BmadPluginOptions,
} from "./types.js";

// =============================================================================
// Status Mapping
// =============================================================================

type SudocodeIssueStatus = "open" | "in_progress" | "blocked" | "needs_review" | "closed";

const STORY_STATUS_MAP: Record<BmadStoryStatus, SudocodeIssueStatus> = {
  "backlog": "open",
  "ready-for-dev": "open",
  "in-progress": "in_progress",
  "review": "needs_review",
  "done": "closed",
};

const EPIC_STATUS_MAP: Record<BmadEpicStatus, SudocodeIssueStatus> = {
  "backlog": "open",
  "in-progress": "in_progress",
  "done": "closed",
};

const REVERSE_STORY_STATUS_MAP: Record<SudocodeIssueStatus, BmadStoryStatus> = {
  "open": "ready-for-dev",
  "in_progress": "in-progress",
  "blocked": "in-progress",
  "needs_review": "review",
  "closed": "done",
};

const REVERSE_EPIC_STATUS_MAP: Record<SudocodeIssueStatus, BmadEpicStatus> = {
  "open": "backlog",
  "in_progress": "in-progress",
  "blocked": "in-progress",
  "needs_review": "in-progress",
  "closed": "done",
};

/**
 * Map a BMAD story status to a sudocode issue status
 */
export function mapStoryStatus(status?: BmadStoryStatus): SudocodeIssueStatus {
  if (!status) return "open";
  return STORY_STATUS_MAP[status] ?? "open";
}

/**
 * Map a BMAD epic status to a sudocode issue status
 */
export function mapEpicStatus(status?: BmadEpicStatus): SudocodeIssueStatus {
  if (!status) return "open";
  return EPIC_STATUS_MAP[status] ?? "open";
}

/**
 * Map a sudocode issue status back to a BMAD story status
 */
export function reverseMapStoryStatus(status: SudocodeIssueStatus): BmadStoryStatus {
  return REVERSE_STORY_STATUS_MAP[status] ?? "backlog";
}

/**
 * Map a sudocode issue status back to a BMAD epic status
 */
export function reverseMapEpicStatus(status: SudocodeIssueStatus): BmadEpicStatus {
  return REVERSE_EPIC_STATUS_MAP[status] ?? "backlog";
}

// =============================================================================
// BMAD → ExternalEntity Conversion
// =============================================================================

/**
 * Convert a parsed BMAD planning artifact to an ExternalEntity (as spec)
 */
export function artifactToExternalEntity(
  artifact: ParsedArtifact,
  id: string,
): ExternalEntity {
  return {
    id,
    type: "spec",
    title: artifact.title,
    description: artifact.content,
    priority: 2,
    raw: {
      artifactType: artifact.type,
      filePath: artifact.filePath,
      frontmatter: artifact.frontmatter,
      sections: artifact.sections,
    },
  };
}

/**
 * Convert a parsed BMAD epic to an ExternalEntity (as issue)
 *
 * Epics become parent issues. Their inline stories are tracked in raw data
 * but converted separately via storyToExternalEntity.
 */
export function epicToExternalEntity(
  epic: ParsedEpic,
  id: string,
  prdSpecId?: string,
): ExternalEntity {
  const relationships: ExternalRelationship[] = [];

  // Epic implements the PRD spec
  if (prdSpecId) {
    relationships.push({
      targetId: prdSpecId,
      targetType: "spec",
      relationshipType: "implements",
    });
  }

  return {
    id,
    type: "issue",
    title: epic.title,
    description: epic.description,
    status: epic.status ? mapEpicStatus(epic.status) : "open",
    priority: 2,
    relationships: relationships.length > 0 ? relationships : undefined,
    raw: {
      entityKind: "epic",
      epicNumber: epic.number,
      filePath: epic.filePath,
      inlineStories: epic.stories,
    },
  };
}

/**
 * Convert a parsed BMAD story to an ExternalEntity (as issue)
 *
 * Stories become child issues under their parent epic.
 */
export function storyToExternalEntity(
  story: ParsedStory,
  id: string,
  epicId: string,
): ExternalEntity {
  // Build content from story content + formatted acceptance criteria
  let content = story.content;

  if (story.acceptanceCriteria.length > 0) {
    content += "\n\n## Acceptance Criteria\n\n";
    for (const ac of story.acceptanceCriteria) {
      content += `### ${ac.id}\n`;
      content += `- **Given** ${ac.given}\n`;
      content += `- **When** ${ac.when}\n`;
      content += `- **Then** ${ac.then}\n\n`;
    }
  }

  if (story.tasks.length > 0) {
    content += "\n## Tasks\n\n";
    for (const task of story.tasks) {
      content += formatTask(task, 0);
    }
  }

  const relationships: ExternalRelationship[] = [
    {
      targetId: epicId,
      targetType: "issue",
      relationshipType: "implements",
    },
  ];

  return {
    id,
    type: "issue",
    title: story.title,
    description: content,
    status: story.status ? mapStoryStatus(story.status) : "open",
    priority: 2,
    relationships,
    raw: {
      entityKind: "story",
      epicNumber: story.epicNumber,
      storyNumber: story.storyNumber,
      slug: story.slug,
      filePath: story.filePath,
      frontmatter: story.frontmatter,
      acceptanceCriteria: story.acceptanceCriteria,
      tasks: story.tasks,
    },
  };
}

function formatTask(task: { id: string; title: string; completed: boolean; subtasks?: Array<{ id: string; title: string; completed: boolean; subtasks?: unknown[] }> }, indent: number): string {
  const prefix = "  ".repeat(indent);
  const checkbox = task.completed ? "[x]" : "[ ]";
  let result = `${prefix}- ${checkbox} ${task.title}\n`;
  if (task.subtasks) {
    for (const sub of task.subtasks) {
      result += formatTask(sub as typeof task, indent + 1);
    }
  }
  return result;
}

// =============================================================================
// ExternalEntity → sudocode (mapToSudocode)
// =============================================================================

/**
 * Map an ExternalEntity to sudocode Spec or Issue format.
 *
 * This is called by the sync engine to create/update sudocode entities
 * from BMAD artifacts.
 */
export function mapToSudocode(external: ExternalEntity): {
  spec?: Partial<Spec>;
  issue?: Partial<Issue>;
  relationships?: ExternalRelationship[];
} {
  if (external.type === "spec") {
    return {
      spec: {
        title: external.title,
        content: external.description ?? "",
        priority: external.priority ?? 2,
      },
      relationships: external.relationships,
    };
  }

  // Issue (epic or story)
  const raw = external.raw as Record<string, unknown> | undefined;
  const entityKind = raw?.entityKind as string | undefined;

  const issue: Partial<Issue> = {
    title: external.title,
    content: external.description ?? "",
    priority: external.priority ?? 2,
    status: mapExternalStatus(external.status),
  };

  // Stories have a parent epic — the sync engine uses the "implements"
  // relationship to set parent_id on the issue
  if (entityKind === "epic") {
    // Epics are parent issues — no additional mapping needed
  }

  return {
    issue,
    relationships: external.relationships,
  };
}

function mapExternalStatus(status?: string): SudocodeIssueStatus {
  if (!status) return "open";
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, SudocodeIssueStatus> = {
    open: "open",
    in_progress: "in_progress",
    blocked: "blocked",
    needs_review: "needs_review",
    closed: "closed",
  };
  return map[normalized] ?? "open";
}

// =============================================================================
// sudocode → ExternalEntity (mapFromSudocode)
// =============================================================================

/**
 * Map a sudocode entity back to external format for bidirectional sync.
 *
 * Primarily used for status changes flowing from sudocode back to BMAD
 * (e.g., closing an issue updates sprint-status.yaml).
 */
export function mapFromSudocode(entity: Spec | Issue): Partial<ExternalEntity> {
  const isIssue = "status" in entity;

  if (!isIssue) {
    return {
      type: "spec",
      title: entity.title,
      description: entity.content,
      priority: entity.priority,
    };
  }

  const issue = entity as Issue;
  return {
    type: "issue",
    title: issue.title,
    description: issue.content,
    status: issue.status,
    priority: issue.priority,
  };
}

// =============================================================================
// Sprint Status Helpers
// =============================================================================

/**
 * Apply sprint-status.yaml data to an existing set of ExternalEntities,
 * updating their status fields.
 *
 * Called during searchEntities to overlay sprint status onto epic/story entities.
 */
export function applySprintStatus(
  entities: ExternalEntity[],
  sprintStatus: ParsedSprintStatus,
  options: BmadPluginOptions,
): void {
  const epicPrefix = options.epic_prefix ?? "bme";
  const storyPrefix = options.story_prefix ?? "bms";

  for (const sprintEpic of sprintStatus.epics) {
    // Find matching epic entity
    const epicId = `${epicPrefix}-${sprintEpic.epicNumber}`;
    const epicEntity = entities.find((e) => e.id === epicId);
    if (epicEntity) {
      epicEntity.status = mapEpicStatus(sprintEpic.status);
    }

    // Find matching story entities
    for (const sprintStory of sprintEpic.stories) {
      // Story IDs follow pattern: bms-{epicN}-{storyN}
      // Sprint stories use a kebab-case key, so we match by searching
      const storyEntity = entities.find((e) => {
        if (!e.id.startsWith(storyPrefix)) return false;
        const raw = e.raw as Record<string, unknown> | undefined;
        return raw?.slug === sprintStory.key;
      });
      if (storyEntity) {
        storyEntity.status = mapStoryStatus(sprintStory.status);
      }
    }
  }
}
