/**
 * Story File Parser
 *
 * Parses standalone BMAD story files from
 * _bmad-output/implementation-artifacts/story-{slug}.md
 *
 * Story file format:
 * ```markdown
 * # Story 1.2: User Authentication
 *
 * Status: ready-for-dev
 *
 * ## Story
 *
 * As a user, I want to log in, so that I can access my account.
 *
 * ## Acceptance Criteria
 *
 * 1. **Given** a valid user account
 *    **When** the user enters correct credentials
 *    **Then** they are logged in
 *
 * ## Tasks / Subtasks
 *
 * - [ ] Implement login form (AC: #1)
 *   - [ ] Add email field
 *   - [ ] Add password field
 * - [x] Set up auth middleware (AC: #1)
 *
 * ## Dev Notes
 * ...
 * ```
 */

import * as path from "path";
import type {
  ParsedStory,
  AcceptanceCriterion,
  StoryTask,
  BmadStoryStatus,
} from "../types.js";
import {
  readMarkdownFile,
  extractSections,
  extractStatus,
  extractCheckboxes,
} from "./markdown-utils.js";
import { existsSync, readdirSync } from "fs";

// =============================================================================
// Patterns
// =============================================================================

/** Match "# Story N.M: Title" */
const STORY_TITLE_RE = /^#\s+Story\s+(\d+)\.(\d+)\s*[:\-–—]\s*(.+)$/im;

/** Match filename: story-1-2-user-auth.md */
const STORY_FILENAME_RE = /^story[- ](\d+)[- ](\d+)[- ](.+)\.md$/i;

/** Acceptance criteria patterns */
const AC_GIVEN_RE = /^\*?\*?Given\*?\*?\s+(.+)$/;
const AC_WHEN_RE = /^\*?\*?When\*?\*?\s+(.+)$/;
const AC_THEN_RE = /^\*?\*?Then\*?\*?\s+(.+)$/;

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parse a standalone story file.
 *
 * @param filePath - Absolute path to the story file
 * @returns ParsedStory
 */
export function parseStoryFile(filePath: string): ParsedStory {
  const doc = readMarkdownFile(filePath);
  const filename = path.basename(filePath);

  // Extract epic/story numbers and title from the H1 heading
  let epicNumber = 0;
  let storyNumber = 0;
  let title = "";

  const titleMatch = doc.body.match(STORY_TITLE_RE);
  if (titleMatch) {
    epicNumber = parseInt(titleMatch[1], 10);
    storyNumber = parseInt(titleMatch[2], 10);
    title = titleMatch[3].trim();
  }

  // Fallback: extract from filename
  if (epicNumber === 0 || storyNumber === 0) {
    const filenameMatch = filename.match(STORY_FILENAME_RE);
    if (filenameMatch) {
      epicNumber = epicNumber || parseInt(filenameMatch[1], 10);
      storyNumber = storyNumber || parseInt(filenameMatch[2], 10);
      if (!title) {
        title = filenameMatch[3]
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    }
  }

  // Extract slug from filename
  const slug = filename
    .replace(/\.md$/i, "")
    .replace(/^story[- ]?/i, "");

  // Extract status
  const status = parseStoryStatus(extractStatus(doc.body));

  // Extract sections
  const sections = extractSections(doc.body);

  // Extract acceptance criteria from AC section
  const acSection = sections.find(
    (s) => s.heading.toLowerCase().includes("acceptance criteria"),
  );
  const acceptanceCriteria = acSection
    ? parseAcceptanceCriteria(acSection.content)
    : [];

  // Extract tasks from Tasks section
  const tasksSection = sections.find(
    (s) =>
      s.heading.toLowerCase().includes("task") ||
      s.heading.toLowerCase().includes("subtask"),
  );
  const tasks = tasksSection ? parseTasks(tasksSection.content) : [];

  // Build content from Story section (the user story text)
  const storySection = sections.find(
    (s) => s.heading.toLowerCase() === "story",
  );
  const content = storySection?.content ?? doc.body;

  return {
    epicNumber,
    storyNumber,
    title,
    slug,
    content,
    filePath,
    frontmatter: doc.frontmatter,
    acceptanceCriteria,
    tasks,
    status,
  };
}

/**
 * Scan a directory for story files and parse them all.
 *
 * @param dir - Directory to scan for story-*.md files
 * @returns Array of parsed stories, sorted by epic then story number
 */
export function scanAndParseStories(dir: string): ParsedStory[] {
  if (!existsSync(dir)) {
    return [];
  }

  const stories: ParsedStory[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.match(/^story[- ]/i)) continue;
    if (!entry.name.endsWith(".md")) continue;

    const storyPath = path.join(dir, entry.name);
    try {
      stories.push(parseStoryFile(storyPath));
    } catch (error) {
      console.error(`[bmad] Error parsing story file ${storyPath}:`, error);
    }
  }

  return stories.sort((a, b) => {
    if (a.epicNumber !== b.epicNumber) return a.epicNumber - b.epicNumber;
    return a.storyNumber - b.storyNumber;
  });
}

// =============================================================================
// Acceptance Criteria Parsing
// =============================================================================

/**
 * Parse acceptance criteria from a markdown section.
 *
 * Handles both numbered list format and bold Given/When/Then format.
 */
function parseAcceptanceCriteria(content: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  const lines = content.split("\n");

  let currentAC: { given: string; when: string; then: string } | null = null;
  let acIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    const givenMatch = trimmed.match(AC_GIVEN_RE);
    if (givenMatch) {
      // Flush previous AC
      if (currentAC && currentAC.given && currentAC.when && currentAC.then) {
        acIndex++;
        criteria.push({
          id: `AC-${acIndex}`,
          given: currentAC.given,
          when: currentAC.when,
          then: currentAC.then,
        });
      }
      currentAC = { given: givenMatch[1].trim(), when: "", then: "" };
      continue;
    }

    const whenMatch = trimmed.match(AC_WHEN_RE);
    if (whenMatch && currentAC) {
      currentAC.when = whenMatch[1].trim();
      continue;
    }

    const thenMatch = trimmed.match(AC_THEN_RE);
    if (thenMatch && currentAC) {
      currentAC.then = thenMatch[1].trim();
      continue;
    }
  }

  // Flush last AC
  if (currentAC && currentAC.given && currentAC.when && currentAC.then) {
    acIndex++;
    criteria.push({
      id: `AC-${acIndex}`,
      given: currentAC.given,
      when: currentAC.when,
      then: currentAC.then,
    });
  }

  return criteria;
}

// =============================================================================
// Task Parsing
// =============================================================================

/**
 * Parse task checkboxes into a hierarchical StoryTask structure.
 */
function parseTasks(content: string): StoryTask[] {
  const checkboxes = extractCheckboxes(content);
  if (checkboxes.length === 0) return [];

  const tasks: StoryTask[] = [];
  const stack: { task: StoryTask; indent: number }[] = [];
  let taskCounter = 0;

  for (const cb of checkboxes) {
    taskCounter++;
    const task: StoryTask = {
      id: `T${taskCounter}`,
      title: cb.title,
      completed: cb.completed,
    };

    // Find parent based on indentation
    while (stack.length > 0 && stack[stack.length - 1].indent >= cb.indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level task
      tasks.push(task);
    } else {
      // Subtask
      const parent = stack[stack.length - 1].task;
      if (!parent.subtasks) parent.subtasks = [];
      parent.subtasks.push(task);
    }

    stack.push({ task, indent: cb.indent });
  }

  return tasks;
}

// =============================================================================
// Status Parsing
// =============================================================================

function parseStoryStatus(raw?: string): BmadStoryStatus | undefined {
  if (!raw) return undefined;

  const normalized = raw.toLowerCase().trim().replace(/\s+/g, "-");
  const validStatuses: BmadStoryStatus[] = [
    "backlog",
    "ready-for-dev",
    "in-progress",
    "review",
    "done",
  ];

  if (validStatuses.includes(normalized as BmadStoryStatus)) {
    return normalized as BmadStoryStatus;
  }

  return undefined;
}
