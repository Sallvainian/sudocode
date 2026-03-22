/**
 * Generic Artifact Parser
 *
 * Parses any BMAD planning artifact (PRD, architecture, ux-spec,
 * product-brief, project-context) into a ParsedArtifact.
 *
 * This is the unified entry point — each artifact type shares the same
 * markdown structure (frontmatter + sections), just with different type tags.
 */

import type { ParsedArtifact, ParsedSection } from "../types.js";
import {
  readMarkdownFile,
  extractTitle,
  extractSections,
} from "./markdown-utils.js";

/**
 * Known artifact filename patterns → type mapping.
 * Used for auto-detection when scanning the planning-artifacts directory.
 */
const FILENAME_TYPE_MAP: Record<string, ParsedArtifact["type"]> = {
  "prd": "prd",
  "architecture": "architecture",
  "ux-spec": "ux-spec",
  "ux-design": "ux-spec",
  "product-brief": "product-brief",
  "brief": "product-brief",
  "project-context": "project-context",
};

/**
 * Default titles for each artifact type (used when no H1 heading found)
 */
const DEFAULT_TITLES: Record<ParsedArtifact["type"], string> = {
  "prd": "Product Requirements Document",
  "architecture": "Architecture",
  "ux-spec": "UX Specification",
  "product-brief": "Product Brief",
  "project-context": "Project Context",
};

/**
 * Parse any BMAD planning artifact file.
 *
 * @param filePath - Absolute path to the artifact file
 * @param artifactType - The artifact type
 * @returns ParsedArtifact
 */
export function parseArtifact(
  filePath: string,
  artifactType: ParsedArtifact["type"],
): ParsedArtifact {
  const doc = readMarkdownFile(filePath);
  const title = extractTitle(doc.body) ?? DEFAULT_TITLES[artifactType];
  const sections = extractSections(doc.body);

  return {
    type: artifactType,
    title,
    content: doc.raw,
    filePath,
    frontmatter: doc.frontmatter,
    sections: sections.map(toSection),
  };
}

/**
 * Detect the artifact type from a filename.
 *
 * Matches against known patterns (case-insensitive, ignoring extension).
 * Returns undefined if the filename doesn't match any known pattern.
 *
 * @example
 * detectArtifactType("PRD.md")              // "prd"
 * detectArtifactType("architecture.md")     // "architecture"
 * detectArtifactType("ux-spec.md")          // "ux-spec"
 * detectArtifactType("random-notes.md")     // undefined
 */
export function detectArtifactType(
  filename: string,
): ParsedArtifact["type"] | undefined {
  // Strip extension and normalize
  const base = filename
    .replace(/\.md$/i, "")
    .toLowerCase()
    .trim();

  // Direct match
  if (FILENAME_TYPE_MAP[base]) {
    return FILENAME_TYPE_MAP[base];
  }

  // Partial match — check if filename contains a known pattern
  for (const [pattern, type] of Object.entries(FILENAME_TYPE_MAP)) {
    if (base.includes(pattern)) {
      return type;
    }
  }

  return undefined;
}

function toSection(s: { heading: string; level: number; content: string; startLine: number }): ParsedSection {
  return {
    heading: s.heading,
    level: s.level,
    content: s.content,
    startLine: s.startLine,
  };
}
