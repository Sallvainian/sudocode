/**
 * Epic File Parser
 *
 * Parses BMAD epic files from _bmad-output/planning-artifacts/epics/.
 *
 * Supports two formats:
 * 1. Sharded: Individual files like epics/epic-1.md, epics/epic-2.md
 * 2. Combined: Single epics.md with all epics
 *
 * Epic file format:
 * ```markdown
 * ---
 * stepsCompleted: []
 * ---
 * ## Epic 1: Title
 *
 * Epic description...
 *
 * ### Story 1.1: Story Title
 *
 * As a [role], I want [action], so that [benefit].
 *
 * **Acceptance Criteria:**
 * **Given** precondition
 * **When** action
 * **Then** expected outcome
 * ```
 */

import { existsSync, readdirSync, statSync } from "fs";
import * as path from "path";
import type { ParsedEpic, ParsedInlineStory } from "../types.js";
import { readMarkdownFile, extractSections } from "./markdown-utils.js";

// =============================================================================
// Patterns
// =============================================================================

/** Match "Epic N: Title" or "## Epic N: Title" */
const EPIC_HEADING_RE = /^#+\s+Epic\s+(\d+)\s*[:\-–—]\s*(.+)$/i;

/** Match "Story N.M: Title" or "### Story N.M: Title" */
const STORY_HEADING_RE = /^#+\s+Story\s+(\d+)\.(\d+)\s*[:\-–—]\s*(.+)$/i;

/** Match acceptance criteria patterns */
const AC_GIVEN_RE = /^\*?\*?Given\*?\*?\s+(.+)$/im;
const AC_WHEN_RE = /^\*?\*?When\*?\*?\s+(.+)$/im;
const AC_THEN_RE = /^\*?\*?Then\*?\*?\s+(.+)$/im;
const AC_AND_RE = /^\*?\*?And\*?\*?\s+(.+)$/gim;

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parse a single epic file (e.g., epic-1.md).
 *
 * @param filePath - Absolute path to the epic file
 * @returns ParsedEpic
 */
export function parseEpicFile(filePath: string): ParsedEpic {
  const doc = readMarkdownFile(filePath);
  const sections = extractSections(doc.body);

  // Find the epic heading to extract number and title
  let epicNumber = 0;
  let epicTitle = "";
  let epicDescriptionParts: string[] = [];

  for (const section of sections) {
    const epicMatch = section.heading.match(
      /^Epic\s+(\d+)\s*[:\-–—]\s*(.+)$/i,
    );
    if (epicMatch) {
      epicNumber = parseInt(epicMatch[1], 10);
      epicTitle = epicMatch[2].trim();
      epicDescriptionParts.push(section.content);
      break;
    }
  }

  // Fallback: try to extract from filename
  if (epicNumber === 0) {
    const filenameMatch = path.basename(filePath).match(/epic[- ]?(\d+)/i);
    if (filenameMatch) {
      epicNumber = parseInt(filenameMatch[1], 10);
    }
  }

  // Fallback title from first H1 or H2
  if (!epicTitle) {
    const firstHeading = sections[0];
    if (firstHeading) {
      epicTitle = firstHeading.heading;
      epicDescriptionParts = [firstHeading.content];
    }
  }

  // Extract inline stories
  const stories = extractInlineStories(doc.body);

  // Build description from non-story sections
  const description = epicDescriptionParts.join("\n\n").trim();

  return {
    number: epicNumber,
    title: epicTitle,
    description,
    filePath,
    stories,
  };
}

/**
 * Parse a combined epics.md file containing all epics.
 *
 * @param filePath - Absolute path to epics.md
 * @returns Array of ParsedEpic (one per epic section)
 */
export function parseCombinedEpicsFile(filePath: string): ParsedEpic[] {
  const doc = readMarkdownFile(filePath);
  const epics: ParsedEpic[] = [];

  // Split content by epic headings
  const lines = doc.body.split("\n");
  let currentEpic: { number: number; title: string; startLine: number; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(EPIC_HEADING_RE);
    if (match) {
      // Flush previous epic
      if (currentEpic) {
        epics.push(buildEpicFromLines(currentEpic, filePath));
      }
      currentEpic = {
        number: parseInt(match[1], 10),
        title: match[2].trim(),
        startLine: i,
        lines: [],
      };
    } else if (currentEpic) {
      currentEpic.lines.push(lines[i]);
    }
  }

  // Flush last epic
  if (currentEpic) {
    epics.push(buildEpicFromLines(currentEpic, filePath));
  }

  return epics;
}

/**
 * Scan a directory for epic files and parse them all.
 *
 * Handles both sharded (epics/epic-N.md) and combined (epics.md) formats.
 *
 * @param epicsDir - Path to the epics directory or file
 * @returns Array of parsed epics, sorted by number
 */
export function scanAndParseEpics(epicsDir: string): ParsedEpic[] {
  if (!existsSync(epicsDir)) {
    return [];
  }

  // Check if it's a single file (epics.md)
  const stat = statSync(epicsDir);
  if (stat.isFile()) {
    return parseCombinedEpicsFile(epicsDir);
  }

  // It's a directory — scan for epic-*.md files
  const epics: ParsedEpic[] = [];
  const entries = readdirSync(epicsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.match(/^epic[- ]?\d+\.md$/i)) continue;

    const epicPath = path.join(epicsDir, entry.name);
    try {
      epics.push(parseEpicFile(epicPath));
    } catch (error) {
      console.error(`[bmad] Error parsing epic file ${epicPath}:`, error);
    }
  }

  // Also check for combined epics.md in the directory
  const combinedPath = path.join(epicsDir, "epics.md");
  if (existsSync(combinedPath) && epics.length === 0) {
    try {
      epics.push(...parseCombinedEpicsFile(combinedPath));
    } catch (error) {
      console.error(`[bmad] Error parsing combined epics file:`, error);
    }
  }

  return epics.sort((a, b) => a.number - b.number);
}

// =============================================================================
// Helpers
// =============================================================================

function buildEpicFromLines(
  epic: { number: number; title: string; startLine: number; lines: string[] },
  filePath: string,
): ParsedEpic {
  const content = epic.lines.join("\n");
  const stories = extractInlineStories(content);

  // Description is the content before the first story heading
  let description = "";
  for (const line of epic.lines) {
    if (STORY_HEADING_RE.test(line)) break;
    description += line + "\n";
  }

  return {
    number: epic.number,
    title: epic.title,
    description: description.trim(),
    filePath,
    stories,
  };
}

/**
 * Extract inline story definitions from markdown content.
 */
function extractInlineStories(content: string): ParsedInlineStory[] {
  const stories: ParsedInlineStory[] = [];
  const lines = content.split("\n");
  let currentStory: { epicN: number; storyN: number; title: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(STORY_HEADING_RE);
    if (match) {
      // Flush previous story
      if (currentStory) {
        stories.push(buildInlineStory(currentStory));
      }
      currentStory = {
        epicN: parseInt(match[1], 10),
        storyN: parseInt(match[2], 10),
        title: match[3].trim(),
        lines: [],
      };
    } else if (currentStory) {
      // Stop collecting if we hit another epic heading
      if (EPIC_HEADING_RE.test(lines[i])) {
        stories.push(buildInlineStory(currentStory));
        currentStory = null;
      } else {
        currentStory.lines.push(lines[i]);
      }
    }
  }

  // Flush last story
  if (currentStory) {
    stories.push(buildInlineStory(currentStory));
  }

  return stories;
}

function buildInlineStory(
  story: { epicN: number; storyN: number; title: string; lines: string[] },
): ParsedInlineStory {
  const content = story.lines.join("\n");

  // Extract acceptance criteria
  const acceptanceCriteria: string[] = [];
  const givenMatch = content.match(AC_GIVEN_RE);
  const whenMatch = content.match(AC_WHEN_RE);
  const thenMatch = content.match(AC_THEN_RE);

  if (givenMatch && whenMatch && thenMatch) {
    let ac = `Given ${givenMatch[1]}, When ${whenMatch[1]}, Then ${thenMatch[1]}`;
    // Collect And clauses
    const andMatches = [...content.matchAll(AC_AND_RE)];
    for (const andMatch of andMatches) {
      ac += `, And ${andMatch[1]}`;
    }
    acceptanceCriteria.push(ac);
  }

  return {
    number: story.storyN,
    title: story.title,
    description: content.trim(),
    acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
  };
}
