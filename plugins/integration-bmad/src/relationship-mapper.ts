/**
 * Relationship Mapping for BMAD Integration
 *
 * Maps BMAD artifact hierarchy to sudocode relationships.
 *
 * BMAD hierarchy:
 * ```
 * PRD (spec)
 *   ├── Architecture (spec) ─── references PRD
 *   ├── UX Spec (spec) ─────── references PRD
 *   └── Epic N (issue)
 *         ├── implements PRD
 *         └── Story N.M (issue)
 *               └── implements Epic N
 * ```
 *
 * Following the SpecKit relationship-mapper pattern.
 */

import type { ExternalEntity } from "@sudocode-ai/types";
import {
  generateSpecId,
  generateEpicId,
  generateStoryId,
} from "./id-generator.js";
import type { ParsedEpic, ParsedArtifact } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/** Extract the relationship type from ExternalEntity's relationships array */
type RelationshipType = NonNullable<ExternalEntity["relationships"]>[number]["relationshipType"];

/**
 * A relationship to be created in sudocode.
 * Uses the same relationship type as ExternalEntity for consistency.
 */
export interface MappedRelationship {
  /** Source entity ID (the "from" side) */
  fromId: string;
  /** Source entity type */
  fromType: "spec" | "issue";
  /** Target entity ID (the "to" side) */
  targetId: string;
  /** Target entity type */
  targetType: "spec" | "issue";
  /** Relationship type */
  relationshipType: RelationshipType;
}

// =============================================================================
// Full Project Mapping
// =============================================================================

/**
 * Map all relationships for a BMAD project.
 *
 * Creates the complete relationship graph:
 * 1. Architecture references PRD
 * 2. UX Spec references PRD
 * 3. Each epic implements PRD
 * 4. Each story implements its epic
 *
 * @param artifacts - Parsed planning artifacts (to know which exist)
 * @param epics - Parsed epics with inline stories
 * @param options - Prefix configuration
 * @returns Array of relationships to create
 */
export function mapProjectRelationships(
  artifacts: ParsedArtifact[],
  epics: ParsedEpic[],
  options: {
    specPrefix?: string;
    epicPrefix?: string;
    storyPrefix?: string;
  } = {},
): MappedRelationship[] {
  const specPrefix = options.specPrefix ?? "bm";
  const epicPrefix = options.epicPrefix ?? "bme";
  const storyPrefix = options.storyPrefix ?? "bms";

  const relationships: MappedRelationship[] = [];

  // Check which artifacts exist
  const hasPrd = artifacts.some((a) => a.type === "prd");
  const hasArch = artifacts.some((a) => a.type === "architecture");
  const hasUx = artifacts.some((a) => a.type === "ux-spec");

  const prdId = generateSpecId("prd", specPrefix);

  // 1. Architecture references PRD
  if (hasArch && hasPrd) {
    relationships.push({
      fromId: generateSpecId("architecture", specPrefix),
      fromType: "spec",
      targetId: prdId,
      targetType: "spec",
      relationshipType: "references",
    });
  }

  // 2. UX Spec references PRD
  if (hasUx && hasPrd) {
    relationships.push({
      fromId: generateSpecId("ux-spec", specPrefix),
      fromType: "spec",
      targetId: prdId,
      targetType: "spec",
      relationshipType: "references",
    });
  }

  // 3. Each epic implements PRD
  for (const epic of epics) {
    const epicId = generateEpicId(epic.number, epicPrefix);

    if (hasPrd) {
      relationships.push({
        fromId: epicId,
        fromType: "issue",
        targetId: prdId,
        targetType: "spec",
        relationshipType: "implements",
      });
    }

    // 4. Each story implements its epic
    for (const story of epic.stories) {
      const storyId = generateStoryId(epic.number, story.number, storyPrefix);
      relationships.push({
        fromId: storyId,
        fromType: "issue",
        targetId: epicId,
        targetType: "issue",
        relationshipType: "implements",
      });
    }
  }

  return relationships;
}

// =============================================================================
// Individual Relationship Helpers
// =============================================================================

/**
 * Create an "implements" relationship from an epic to the PRD.
 */
export function mapEpicToPrd(
  epicNumber: number,
  specPrefix: string = "bm",
  epicPrefix: string = "bme",
): MappedRelationship {
  return {
    fromId: generateEpicId(epicNumber, epicPrefix),
    fromType: "issue",
    targetId: generateSpecId("prd", specPrefix),
    targetType: "spec",
    relationshipType: "implements",
  };
}

/**
 * Create an "implements" relationship from a story to its epic.
 */
export function mapStoryToEpic(
  epicNumber: number,
  storyNumber: number,
  epicPrefix: string = "bme",
  storyPrefix: string = "bms",
): MappedRelationship {
  return {
    fromId: generateStoryId(epicNumber, storyNumber, storyPrefix),
    fromType: "issue",
    targetId: generateEpicId(epicNumber, epicPrefix),
    targetType: "issue",
    relationshipType: "implements",
  };
}

/**
 * Create a "references" relationship from architecture to PRD.
 */
export function mapArchToPrd(
  specPrefix: string = "bm",
): MappedRelationship {
  return {
    fromId: generateSpecId("architecture", specPrefix),
    fromType: "spec",
    targetId: generateSpecId("prd", specPrefix),
    targetType: "spec",
    relationshipType: "references",
  };
}

/**
 * Create a "references" relationship from UX spec to PRD.
 */
export function mapUxToPrd(
  specPrefix: string = "bm",
): MappedRelationship {
  return {
    fromId: generateSpecId("ux-spec", specPrefix),
    fromType: "spec",
    targetId: generateSpecId("prd", specPrefix),
    targetType: "spec",
    relationshipType: "references",
  };
}

/**
 * Map story dependency relationships.
 *
 * If inline stories have `dependsOn` arrays, creates "depends-on"
 * relationships between stories within the same epic.
 */
export function mapStoryDependencies(
  epic: ParsedEpic,
  epicPrefix: string = "bme",
  storyPrefix: string = "bms",
): MappedRelationship[] {
  const relationships: MappedRelationship[] = [];

  for (const story of epic.stories) {
    if (!story.dependsOn || story.dependsOn.length === 0) continue;

    const storyId = generateStoryId(epic.number, story.number, storyPrefix);

    for (const depStoryNum of story.dependsOn) {
      const depStoryId = generateStoryId(epic.number, depStoryNum, storyPrefix);
      relationships.push({
        fromId: storyId,
        fromType: "issue",
        targetId: depStoryId,
        targetType: "issue",
        relationshipType: "depends-on",
      });
    }
  }

  return relationships;
}
