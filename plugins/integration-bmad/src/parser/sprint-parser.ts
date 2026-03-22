/**
 * Sprint Status Parser
 *
 * Parses _bmad-output/implementation-artifacts/sprint-status.yaml
 *
 * Sprint status YAML format:
 * ```yaml
 * generated: 05-06-2025 21:30
 * last_updated: 05-06-2025 21:30
 * project: My Project
 * story_location: "{story_location}"
 *
 * development_status:
 *   epic-1: backlog
 *   1-1-user-auth: done
 *   1-2-account-mgmt: ready-for-dev
 *   epic-1-retrospective: optional
 *   epic-2: in-progress
 *   2-1-personality: in-progress
 *   2-2-chat-interface: backlog
 *   epic-2-retrospective: optional
 * ```
 *
 * Entry patterns:
 * - epic-N: <status>           → Epic status entry
 * - N-M-slug: <status>         → Story status entry
 * - epic-N-retrospective: <s>  → Retrospective entry (ignored)
 */

import { readFileSync } from "fs";
import yaml from "js-yaml";
import type {
  ParsedSprintStatus,
  SprintEpic,
  SprintStory,
  BmadEpicStatus,
  BmadStoryStatus,
} from "../types.js";

// =============================================================================
// Patterns
// =============================================================================

/** Match "epic-N" key */
const EPIC_KEY_RE = /^epic-(\d+)$/;

/** Match "N-M-slug" story key */
const STORY_KEY_RE = /^(\d+)-(\d+)-(.+)$/;

/** Match "epic-N-retrospective" key */
const RETRO_KEY_RE = /^epic-(\d+)-retrospective$/;

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parse a sprint-status.yaml file.
 *
 * @param filePath - Absolute path to sprint-status.yaml
 * @returns ParsedSprintStatus
 */
export function parseSprintStatus(filePath: string): ParsedSprintStatus {
  const content = readFileSync(filePath, "utf-8");
  return parseSprintStatusContent(content);
}

/**
 * Parse sprint-status.yaml from a string.
 *
 * @param content - YAML content string
 * @returns ParsedSprintStatus
 */
export function parseSprintStatusContent(content: string): ParsedSprintStatus {
  const data = yaml.load(content) as Record<string, unknown> | null;

  if (!data) {
    return { epics: [] };
  }

  const developmentStatus = data.development_status as Record<string, string> | undefined;
  if (!developmentStatus || typeof developmentStatus !== "object") {
    return { epics: [] };
  }

  return buildSprintStatus(developmentStatus);
}

// =============================================================================
// Builder
// =============================================================================

function buildSprintStatus(
  devStatus: Record<string, string>,
): ParsedSprintStatus {
  const epicMap = new Map<number, {
    status: BmadEpicStatus;
    stories: SprintStory[];
    retrospective?: { status: string };
  }>();

  // First pass: identify all epics
  for (const [key, value] of Object.entries(devStatus)) {
    const epicMatch = key.match(EPIC_KEY_RE);
    if (epicMatch) {
      const epicNum = parseInt(epicMatch[1], 10);
      if (!epicMap.has(epicNum)) {
        epicMap.set(epicNum, {
          status: normalizeEpicStatus(value),
          stories: [],
        });
      } else {
        epicMap.get(epicNum)!.status = normalizeEpicStatus(value);
      }
    }
  }

  // Second pass: assign stories and retrospectives
  for (const [key, value] of Object.entries(devStatus)) {
    // Skip epic entries
    if (EPIC_KEY_RE.test(key)) continue;

    // Check for retrospective
    const retroMatch = key.match(RETRO_KEY_RE);
    if (retroMatch) {
      const epicNum = parseInt(retroMatch[1], 10);
      const epic = epicMap.get(epicNum);
      if (epic) {
        epic.retrospective = { status: value };
      }
      continue;
    }

    // Check for story
    const storyMatch = key.match(STORY_KEY_RE);
    if (storyMatch) {
      const epicNum = parseInt(storyMatch[1], 10);
      const slug = storyMatch[3];

      // Ensure epic exists
      if (!epicMap.has(epicNum)) {
        epicMap.set(epicNum, {
          status: "backlog",
          stories: [],
        });
      }

      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      epicMap.get(epicNum)!.stories.push({
        key,
        title,
        status: normalizeStoryStatus(value),
      });
    }
  }

  // Build sorted output
  const epics: SprintEpic[] = [];
  const sortedEpicNums = [...epicMap.keys()].sort((a, b) => a - b);

  for (const epicNum of sortedEpicNums) {
    const epic = epicMap.get(epicNum)!;
    epics.push({
      epicNumber: epicNum,
      title: `Epic ${epicNum}`,
      status: epic.status,
      stories: epic.stories,
      retrospective: epic.retrospective,
    });
  }

  return { epics };
}

// =============================================================================
// Status Normalization
// =============================================================================

function normalizeEpicStatus(raw: string): BmadEpicStatus {
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, "-");

  const map: Record<string, BmadEpicStatus> = {
    "backlog": "backlog",
    "in-progress": "in-progress",
    "contexted": "in-progress", // Legacy status
    "done": "done",
    "completed": "done",
  };

  return map[normalized] ?? "backlog";
}

function normalizeStoryStatus(raw: string): BmadStoryStatus {
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, "-");

  const map: Record<string, BmadStoryStatus> = {
    "backlog": "backlog",
    "ready-for-dev": "ready-for-dev",
    "ready": "ready-for-dev",
    "in-progress": "in-progress",
    "review": "review",
    "in-review": "review",
    "done": "done",
    "completed": "done",
  };

  return map[normalized] ?? "backlog";
}
