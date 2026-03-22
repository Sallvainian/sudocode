/**
 * Story File Writer
 *
 * Updates story file content for bidirectional sync.
 * Primarily handles updating the Status line in story files
 * when status changes flow from sudocode back to BMAD.
 */

import { readFileSync, writeFileSync } from "fs";
import type { BmadStoryStatus } from "../types.js";

/**
 * Update the Status line in a story file.
 *
 * @param filePath - Absolute path to the story file
 * @param newStatus - New BMAD story status
 */
export function updateStoryFileStatus(
  filePath: string,
  newStatus: BmadStoryStatus,
): void {
  const content = readFileSync(filePath, "utf-8");
  const statusRe = /^Status:\s*.+$/im;

  let updated: string;
  if (statusRe.test(content)) {
    // Replace existing Status line
    updated = content.replace(statusRe, `Status: ${newStatus}`);
  } else {
    // Insert Status after the first heading
    const lines = content.split("\n");
    const headingIndex = lines.findIndex((line) => /^#\s+/.test(line));
    if (headingIndex >= 0) {
      lines.splice(headingIndex + 1, 0, "", `Status: ${newStatus}`);
      updated = lines.join("\n");
    } else {
      // Prepend if no heading found
      updated = `Status: ${newStatus}\n\n${content}`;
    }
  }

  writeFileSync(filePath, updated, "utf-8");
  console.log(`[bmad] Updated story file status: ${filePath} → ${newStatus}`);
}

/**
 * Update task checkboxes in a story file.
 * Marks all tasks as complete or incomplete.
 *
 * @param filePath - Absolute path to the story file
 * @param completed - Whether to mark all tasks as completed
 */
export function updateAllTasksCompletion(
  filePath: string,
  completed: boolean,
): void {
  const content = readFileSync(filePath, "utf-8");
  const checkbox = completed ? "[x]" : "[ ]";

  const updated = content.replace(
    /- \[[ xX]\]/g,
    `- ${checkbox}`,
  );

  writeFileSync(filePath, updated, "utf-8");
  console.log(
    `[bmad] ${completed ? "Completed" : "Reset"} all tasks in: ${filePath}`,
  );
}
