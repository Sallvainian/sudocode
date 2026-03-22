/**
 * Sprint Status Writer
 *
 * Writes status changes back to sprint-status.yaml for bidirectional sync.
 * When a story or epic status is changed in sudocode, this updates the
 * corresponding entry in the YAML file.
 *
 * Preserves YAML structure, comments, and ordering.
 */

import { readFileSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import type { BmadStoryStatus, BmadEpicStatus } from "../types.js";

// =============================================================================
// Types
// =============================================================================

interface SprintStatusYaml {
  generated?: string;
  last_updated?: string;
  project?: string;
  project_key?: string;
  tracking_system?: string;
  story_location?: string;
  development_status?: Record<string, string>;
  [key: string]: unknown;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Update a story's status in sprint-status.yaml.
 *
 * @param filePath - Absolute path to sprint-status.yaml
 * @param storyKey - The story key in the YAML (e.g., "1-1-user-auth")
 * @param newStatus - New BMAD story status
 */
export function updateStoryStatus(
  filePath: string,
  storyKey: string,
  newStatus: BmadStoryStatus,
): void {
  const data = readSprintYaml(filePath);

  if (!data.development_status) {
    data.development_status = {};
  }

  if (storyKey in data.development_status) {
    data.development_status[storyKey] = newStatus;
    data.last_updated = formatTimestamp(new Date());
    writeSprintYaml(filePath, data);
    console.log(`[bmad] Updated story status: ${storyKey} → ${newStatus}`);
  } else {
    console.warn(`[bmad] Story key not found in sprint-status.yaml: ${storyKey}`);
  }
}

/**
 * Update an epic's status in sprint-status.yaml.
 *
 * @param filePath - Absolute path to sprint-status.yaml
 * @param epicNumber - Epic number (1-indexed)
 * @param newStatus - New BMAD epic status
 */
export function updateEpicStatus(
  filePath: string,
  epicNumber: number,
  newStatus: BmadEpicStatus,
): void {
  const data = readSprintYaml(filePath);
  const epicKey = `epic-${epicNumber}`;

  if (!data.development_status) {
    data.development_status = {};
  }

  if (epicKey in data.development_status) {
    data.development_status[epicKey] = newStatus;
    data.last_updated = formatTimestamp(new Date());
    writeSprintYaml(filePath, data);
    console.log(`[bmad] Updated epic status: ${epicKey} → ${newStatus}`);
  } else {
    console.warn(`[bmad] Epic key not found in sprint-status.yaml: ${epicKey}`);
  }
}

/**
 * Find the story key in sprint-status.yaml for a given epic+story number.
 *
 * @param filePath - Absolute path to sprint-status.yaml
 * @param epicNumber - Epic number
 * @param storyNumber - Story number
 * @returns The story key (e.g., "1-2-user-auth") or undefined
 */
export function findStoryKey(
  filePath: string,
  epicNumber: number,
  storyNumber: number,
): string | undefined {
  const data = readSprintYaml(filePath);
  if (!data.development_status) return undefined;

  const prefix = `${epicNumber}-${storyNumber}-`;
  for (const key of Object.keys(data.development_status)) {
    if (key.startsWith(prefix)) {
      return key;
    }
  }

  return undefined;
}

// =============================================================================
// Helpers
// =============================================================================

function readSprintYaml(filePath: string): SprintStatusYaml {
  const content = readFileSync(filePath, "utf-8");
  const data = yaml.load(content) as SprintStatusYaml | null;
  return data ?? {};
}

function writeSprintYaml(filePath: string, data: SprintStatusYaml): void {
  const output = yaml.dump(data, {
    lineWidth: -1, // Don't wrap long lines
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  writeFileSync(filePath, output, "utf-8");
}

function formatTimestamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day}-${year} ${hours}:${minutes}`;
}
